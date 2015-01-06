#!/usr/bin/env python
# -*- coding: utf-8 -*-

from src.resources.db import db

class Topogram(db.Model):
    """
    Models for topograms. 
    Topograms are visualisation of a selected portion of a dataset.
    """
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.Text)
    es_index_name = db.Column(db.String(200), nullable=False)
    es_query = db.Column(db.String(150), nullable=False)

    data_mongo_id = db.Column(db.String(150))
    records_count = db.Column(db.Integer)

    words_limit = db.Column(db.Integer)
    citations_limit = db.Column(db.Integer)

    words = db.Column(db.Text)
    citations = db.Column(db.Text)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    dataset_id = db.Column(db.Integer, db.ForeignKey('dataset.id'))

    created_at = db.Column(db.DateTime, default=db.func.now())

    def __init__(self, dataset_id, description, es_index_name, es_query, records_count,words_limit, citations_limit, words, citations):
        
        # print dataset_id, description, es_index_name, es_query
        # print g.user.id, g.dataset_id
        self.description = description
        self.es_query = es_query
        self.es_index_name = es_index_name
        
        # self.data_mongo_id = data_mongo_id
        self.records_count = records_count
        self.dataset_id = dataset_id
        self.user_id = g.user.id

        self.words_limit=words_limit
        self.citations_limit=citations_limit
 
    def __repr__(self):
        return '<Topogram %r>' % self.id
