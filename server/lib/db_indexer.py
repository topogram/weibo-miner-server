#!/usr/bin/env python
# -*- coding: utf-8 -*-

import uuid
from collections import Counter
from datetime import datetime
import time

import logging
logger = logging.getLogger("topogram-server.lib.db_indexer")

from server.models.dataset import Dataset

from topogram.topograms.preprocess import NLPPreProcess
from topogram.languages.zh import ChineseNLP
from topogram.corpora.csv_file import CSVCorpus
from topogram.utils import any2utf8

from server import db
from server import mongo


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


def get_words_co_occurences(dataset):

    topogram = get_topogram(dataset)

    # get records in the db
    records= mongo.db[dataset["index_name"]].find()
    for record in records:

        keywords = record["text_column"]

        # compute word graph 
        for w1 in keywords:
            for w2 in keywords : 
                if w1!=w2 :
                    topogram.add_words_edge(w1, w2)

    data = {}
    data["words"] = topogram.export_words_to_d3_js()
    data["density"] = topogram.get_words_density()
    # data["top_words"] = topogram.get_top_words(words_limit)

    return data

def get_most_frequent_words(dataset):

    # topogram = get_topogram(dataset)

    # get records in the db
    records= mongo.db[dataset["index_name"]].find()
    keywords = []
    for record in records:
        keywords += record["text_column"]

    most_common = Counter(keywords).most_common(100)
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
