#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
from bson import json_util

import uuid
from collections import Counter
from datetime import datetime
import time

from  itertools import permutations

import logging
logger = logging.getLogger("topogram-server.lib.db_indexer")

from server.models.dataset import Dataset

from topogram.topograms.preprocess import NLPPreProcess
from topogram.languages.zh import ChineseNLP
from topogram.corpora.csv_file import CSVCorpus
from topogram.utils import any2utf8, any2unicode

from server import app
from server import db
from server import mongo
from server.resources.socketio import socket
from server.resources.rqueue import q

import pickle

def job_done(job):
    print "job is done! "

def get_index_name(file_name):
    safename = "".join([c for c in file_name if c.isalpha() or c.isdigit() or c==' ']).rstrip()
    es_index_name=(safename + "_"+ str(uuid.uuid4())).lower()
    return es_index_name

def get_topogram(dataset):

    if dataset["additional_columns"] : additional_columns = any2utf8(dataset["additional_columns"])
    else : additional_columns = dataset["additional_columns"]

    # open the corpus
    csv_corpus = CSVCorpus(dataset["filepath"], 
                            timestamp_column = dataset["time_column"], 
                            time_pattern= dataset["time_pattern"], 
                            text_column=dataset["text_column"], 
                            source_column= dataset["source_column"],
                            additional_columns=additional_columns )
    # init NLP
    nlp = ChineseNLP()

    # start processing  data
    topogram = NLPPreProcess(corpus=csv_corpus, nlp=nlp)
    print dataset["index_name"]

    return topogram

def process_dataset(dataset):

    job1 = q.enqueue(index_csv_2_db, dataset,  timeout=500)
    job2 = q.enqueue(process_words_co_occurences, dataset, timeout=500)

    return { "jobs" : [job1.key, job2.key]}

def index_csv_2_db(dataset):

    with app.app_context() :

        topogram = get_topogram(dataset)

        # update state machine
        d = Dataset.query.filter_by(id=dataset["id"]).first()
        d.index_state = "processing"
        db.session.commit()

        for i, row in enumerate(topogram.process()):
            # if i == 10 : break
            try : 
                row
            except ValueError,e :
                d.index_state = "error line %s"%i
                db.session.commit()
                return "error line %s"%i
            mongo.db[dataset["index_name"]].insert(row) # write row to db

        # change the state to done
        d.index_state = "done"
        db.session.commit()

        job_done("parsing csv")

def process_words_co_occurences(dataset):
    with app.app_context() :
        topogram = get_topogram(dataset)

        # update state machine
        d = Dataset.query.filter_by(id=dataset["id"]).first()
        d.index_state = "processing"
        db.session.commit()

        # get records in the db
        i=0
        records= mongo.db[dataset["index_name"]].find()
        for i,record in enumerate(records):
            # print i
            # if i == 100 : break;
            keywords = set(record["text_column"]) # set to avoid repetitions

            # compute word graph 
            for word in list(permutations(keywords, 2)) : # pair the words
                topogram.add_words_edge(word[0], word[1])

        print "computing graph ok"
        print "reducing graph size"

        words = topogram.get_words_network(10) # reduce size under 5
        mongo.db["wordGraphs"].insert({ "name" : dataset["index_name"], "words" :words})
        print "graph saved in db"
        
        # change the state to done
        d.index_state = "done"
        db.session.commit()

        job_done("doing nasty stuff")

def get_words_co_occurences(dataset, words_limit, q=None, stopwords=None):

    topogram = get_topogram(dataset)
    words = mongo.db["wordGraphs"].find_one({ "name" : dataset["index_name"]})
    topogram.load_words_from_json(words["words"])

    words_network = topogram.words

    # search term
    if q is not None:
        nodes = [] 
        for w in q : 
            try : 
                nodes = topogram.words[w].keys()
            except KeyError:
                pass
            nodes.append(w)
        words_network = topogram.words.subgraph(nodes)

    if stopwords is not None :
        print words_network.nodes()
        for w in stopwords: 
            print any2unicode(w) in words_network.nodes() 

        words_network.remove_nodes_from([any2unicode(w) for w in stopwords])

        for w in stopwords: 
            print any2unicode(w) in words_network.nodes() 

    print "reduce graph size"
    g= topogram.limit_node_network(words_network, words_limit) # filter out the 

    data = {}
    data["words"] = topogram.export_to_json(g)
    data["density"] = topogram.get_words_density()
    data["top_words"] = topogram.get_nodes_degree(words_network)

    return data

def get_most_frequent_words(dataset, words_limit, q=None, stopwords=None):

    query = build_query(q, stopwords)

    # get records in the db
    records= mongo.db[dataset["index_name"]].find(query)

    keywords = []
    for record in records:
        keywords += record["text_column"]

    most_common = [ { "word" : c[0], "count" : c[1]}for c in Counter(keywords).most_common(words_limit)]

    return most_common

def get_time_series(dataset, q=None, stopwords=None):

    collection_name = dataset["index_name"]
    time_range = 'hour'

    time_series = []

    filters = build_query(q, stopwords)

    # TODO : add query to other time series (only hour implemented)
    if time_range == 'minute':

        query = [
            { "$group" : { "_id" : { 
                "year" : { "$year" : "$time_column"}, 
                "month" : { "$month" : "$time_column"}, 
                "day": { "$dayOfMonth" : "$time_column"},
                "hour": { "$hour" : "$time_column"},
                "minute": { "$minute" : "$time_column"} 
                }, 
                "count" : { "$sum" : 1 } } },
            { "$sort" : { "_id.year": 1, "_id.month" : 1, "_id.day" : 1, '_id.hour' : 1, 
                "_id.minute":1 } }
        ]

        if q is not None or stopwords is not None: query.insert(0, {"$match" : filters })

        times = mongo.db[collection_name].aggregate(query)

        for t in times['result']:
            dt = t['_id']
            dt = datetime( int(dt['year']),int(dt['month']),int(dt['day']), int(dt['hour']), int(dt['minute']))
            time_series.append( {"time" : time.mktime(dt.timetuple()), "count" : int(t['count'])})

    if time_range == 'hour':
        query = [
            { "$group" : { "_id" : { 
                "year" : { "$year" : "$time_column"}, 
                "month" : { "$month" : "$time_column"}, 
                "day": { "$dayOfMonth" : "$time_column"},
                "hour": { "$hour" : "$time_column"}
                }, 
                "count" : { "$sum" : 1 } } 
            },
            { "$sort" : { "_id.year": 1, "_id.month" : 1, "_id.day" : 1, '_id.hour' : 1 } }
        ]
        
        if q is not None or stopwords is not None: query.insert(0, {"$match" : filters })

        times = mongo.db[collection_name].aggregate(query)
        for t in times['result']:
            dt = t['_id']
            dt= datetime( int(dt['year']),int(dt['month']),int(dt['day']), int(dt['hour']) )
            time_series.append( {"time" : time.mktime(dt.timetuple()), "count" : int(t['count'])} )

    if time_range == 'day':

        query = [
            { "$group" : { "_id" : { 
                "year" : { "$year" : "$time_column"}, 
                "month" : { "$month" : "$time_column"}, 
                "day": { "$dayOfMonth" : "$time_column"} }, 
                "count" : { "$sum" : 1 } } },
            { "$sort" : { "_id.year": 1, "_id.month" : 1, "_id.day" : 1 } }
        ]

        if q is not None or stopwords is not None: query.insert(0, {"$match" : filters })
        times = mongo.db[collection_name].aggregate(query)

        for t in times['result']:
            dt = t['_id']
            dt= datetime( int(dt['year']),int(dt['month']),int(dt['day']) )
            time_series.append( {"time" : time.mktime(dt.timetuple())*1000, "count" : int(t['count'])} )

    return time_series

def build_query(q, stopwords):
    # build query
    query = {}
    query_and = []

    if q is not None : 
        query_and.append({"text_column" : { "$in" : [ any2utf8(w) for w in q ] }})

    if stopwords is not None : 
        query_and.append({"text_column" : { "$nin" : stopwords }})

    if stopwords is not None or q is not None : 
         query = {"$and": query_and }

    return query

def get_data_by_search_word(dataset, q, stopwords=None) :

    if type(q) is not list : raise ValueError("words should be a list")
    
    collection_name = dataset["index_name"]
    query = build_query(q, stopwords)
    records = mongo.db[dataset["index_name"]].find(query)

    data = {}
    data["count"] = records.count()
    # get_words_co_occurences(dataset, 100, q=words)

    return data
