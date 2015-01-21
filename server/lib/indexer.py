#!/usr/bin/env python
# -*- coding: utf-8 -*-

from server import db
from server.resources.elastic import elastic
from server.models.dataset import Dataset
from server.models.topogram import Topogram

from flask.ext.rq import job
from server.resources.socketio import socket

from topogram.topograms.basic import BasicTopogram
from topogram.languages.zh import ChineseNLP
from topogram.corpora.csv_file import CSVCorpus
from topogram.corpora.elastic import ElasticCorpus


import logging
logger = logging.getLogger("topogram-server.lib.indexer")

import pickle
import json


@job('taf')
def csv2elastic(dataset):

    logger.info("loading csv file")
    
    # open the corpus
    csv_corpus = CSVCorpus(dataset["filepath"], timestamp_column = dataset["time_column"], time_pattern= dataset["time_pattern"], text_column=dataset["text_column"], source_column= dataset["source_column"])

    # ensure that index exists
    # get_index_info(dataset["index_name"])

    d = Dataset.query.filter_by(id=dataset["id"]).first()
    d.index_state = "processing"
    db.session.commit()

    for i, row in enumerate(csv_corpus) :
        if i%10 == 0: 
            # print "emit socket"
            socket.emit("progress", json.dumps({"count" : i}))

        res = elastic.index(dataset["index_name"], "message", row)

    # change the state to done
    d.index_state = "done"
    db.session.commit()

    return res

def get_index_info( es_index_name):
        res = elastic.status(es_index_name)
        # if res["errors"] is "True": print res
        return res 

def delete_index( es_index_name):
    try :
        res = elastic.delete_index(es_index_name)
        return res
    except IndexMissingException:
        print "index missing"
        return {}

# @job('taf')
def get_topogram(_topogram):

    print _topogram
    nlp = ChineseNLP()
    for word in _topogram["stopwords"].split(","): 
        nlp.stopwords.append(word)
        print word


    es = ElasticCorpus(elastic, _topogram["es_index_name"], _topogram["es_query"])

    socket.emit('progress', {"state":"processing"});

    # process the data
    topogram = BasicTopogram(corpus=es, nlp=nlp)
    topogram.process()

    # get the topgram from the db
    t = Topogram.query.filter_by(id=_topogram["id"]).first()
    data = pickle.dumps(topogram)
    t.networks = data

    db.session.commit()
