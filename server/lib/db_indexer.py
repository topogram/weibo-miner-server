#!/usr/bin/env python
# -*- coding: utf-8 -*-

import uuid
from collections import Counter
from datetime import datetime
import time

from  itertools import combinations

import logging
logger = logging.getLogger("topogram-server.lib.db_indexer")

from server.models.dataset import Dataset

from topogram.topograms.preprocess import NLPPreProcess
from topogram.languages.zh import ChineseNLP
from topogram.corpora.csv_file import CSVCorpus
from topogram.utils import any2utf8

from server import db
from server import mongo

import redis
import pickle

# basic cache with redis
redis_cache = redis.Redis('localhost')

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

def index_csv_2_db(dataset):

    logger.info("writing parsed csv file into %s"%dataset["index_name"])

    topogram = get_topogram(dataset)

    # update state machine
    d = Dataset.query.filter_by(id=dataset["id"]).first()
    d.index_state = "processing"
    db.session.commit()

    for i, row in enumerate(topogram.process()):
        print i
        mongo.db[dataset["index_name"]].insert(row) # write row to db
    
    # change the state to done
    d.index_state = "done"
    db.session.commit()


def get_words_co_occurences(dataset, words_limit):

    topogram = get_topogram(dataset)
    words = redis_cache.get(dataset["index_name"])
    print type(words)

    ok_words = [word["word"] for word in get_most_frequent_words(dataset,words_limit)]
    print len(ok_words)
    if words == None :

        # get records in the db
        records= mongo.db[dataset["index_name"]].find()
        for i,record in enumerate(records):
            # print i
            if i == 100 : break;
            keywords = set(record["text_column"])

            # intersec =  set(keywords).intersection(ok_words)
            # print len(intersec) -1 == 0

            # compute word graph 
            for word in list(permutations(keywords, 2)) : # pair the words
                topogram.add_words_edge(word[0], word[1])

        print "computing graph ok "
        # g = topogram.get_average_graph(topogram.words)

        print "now applying algos"
        clique = topogram.min_weighted_dominating_set(topogram.words)
        print "clique", type(clique)
        
        # g= topogram.limit_node_network(topogram.words, 2) # filter out the marginal words (min =2)
        # print type(g)
        # pickle the whole topogram into redis
        g_dump = topogram.export_words_to_json()
        # redis_cache.set(dataset["index_name"], g_dump)

    else : # get from redis
        g = eval(words)
        topogram.load_words_from_json(g)

    words_networks = topogram.get_words_network(words_limit)
    return words_networks

    # data = {}
    # data["words"] = topogram.export_words_to_d3_js()
    # data["density"] = topogram.get_words_density()
    # data["top_words"] = topogram.get_top_words(words_limit)

    # return data

def get_most_frequent_words(dataset, words_limit):

    # topogram = get_topogram(dataset)

    # get records in the db
    records= mongo.db[dataset["index_name"]].find()
    keywords = []
    for record in records:
        keywords += record["text_column"]

    most_common = [ { "word" : c[0], "count" : c[1]}for c in Counter(keywords).most_common(words_limit)]

    return most_common

def get_time_series(dataset):

    collection_name = dataset["index_name"]
    time_range = 'hour'

    time_series = []

    if time_range == 'minute':
        times = mongo.db[collection_name].aggregate([
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
        ])

        for t in times['result']:
            dt = t['_id']
            dt = datetime( int(dt['year']),int(dt['month']),int(dt['day']), int(dt['hour']), int(dt['minute']))
            time_series.append( {"time" : time.mktime(dt.timetuple()), "count" : int(t['count'])})

    if time_range == 'hour':
        times = mongo.db[collection_name].aggregate([
            { "$group" : { "_id" : { 
                "year" : { "$year" : "$time_column"}, 
                "month" : { "$month" : "$time_column"}, 
                "day": { "$dayOfMonth" : "$time_column"},
                "hour": { "$hour" : "$time_column"}
                }, 
                "count" : { "$sum" : 1 } } 
            },
            { "$sort" : { "_id.year": 1, "_id.month" : 1, "_id.day" : 1, '_id.hour' : 1 } }
        ])
        
        for t in times['result']:
            dt = t['_id']
            dt= datetime( int(dt['year']),int(dt['month']),int(dt['day']), int(dt['hour']) )
            time_series.append( {"time" : time.mktime(dt.timetuple()), "count" : int(t['count'])} )

    if time_range == 'day':
        times = mongo.db[collection_name].aggregate([
            { "$group" : { "_id" : { 
                "year" : { "$year" : "$time_column"}, 
                "month" : { "$month" : "$time_column"}, 
                "day": { "$dayOfMonth" : "$time_column"} }, 
                "count" : { "$sum" : 1 } } },
            { "$sort" : { "_id.year": 1, "_id.month" : 1, "_id.day" : 1 } }
        ])

        for t in times['result']:
            dt = t['_id']
            dt= datetime( int(dt['year']),int(dt['month']),int(dt['day']) )
            time_series.append( {"time" : time.mktime(dt.timetuple())*1000, "count" : int(t['count'])} )

    return time_series
