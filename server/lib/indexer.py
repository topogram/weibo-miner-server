#!/usr/bin/env python
# -*- coding: utf-8 -*-

from server import db
from server.resources.elastic import elastic
from server.models.dataset import Dataset
from server.models.topogram import Topogram
from flask.ext.rq import job

from topogram.topograms.basic import BasicTopogram
from topogram.languages.zh import ChineseNLP
from topogram.corpora.csv_file import CSVCorpus
from topogram.corpora.elastic import ElasticCorpus

import logging
import pickle

logger = logging.getLogger("topogram-server.lib.indexer")

@job('taf')
def csv2elastic(dataset):

    logger.info("loading csv file")
    # open the corpus
    csv_corpus = CSVCorpus(dataset["filepath"], timestamp_column = dataset["time_column"], time_pattern= dataset["time_pattern"], text_column=dataset["text_column"], source_column= dataset["source_column"])

    # ensure that index exists
    # get_index_info(dataset["index_name"])

    # change the job state to "processing"
    print dataset
    d = Dataset.query.filter_by(id=dataset["id"]).first()
    print d
    d.index_state = "processing"
    db.session.commit()

    for row in csv_corpus :
        record = { "text" : row[0], "created_at" : row[1],"source" : row[2]}
        res = elastic.index(dataset["index_name"], "message", record)

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

    nlp = ChineseNLP()
    es = ElasticCorpus(elastic, _topogram["es_index_name"], _topogram["es_query"])

    # process the data
    topogram = BasicTopogram(corpus=es, nlp=nlp)
    topogram.process()

    # get the topgram from the db
    t = Topogram.query.filter_by(id=_topogram["id"]).first()
    data = pickle.dumps(topogram)
    t.networks = data

    db.session.commit()

