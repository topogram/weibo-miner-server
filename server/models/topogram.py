#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask import g
from server import db

class Topogram(db.Model):
    """
    Models for topograms. 
    Topograms are visualisation of a selected portion of a dataset.
    """

    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.Text)

    # es_index_name = db.Column(db.String(200), nullable=False)
    # es_query = db.Column(db.String(150), nullable=False)

    # records_count = db.Column(db.Integer)

    words_limit = db.Column(db.Integer)
    citations_limit = db.Column(db.Integer)

    stopwords = db.Column(db.Text)

    # topogram_regexps = db.Table('topogram_regexps',
    #     db.Column('topogram_id', db.Integer, db.ForeignKey('topogram.id')),
    #     db.Column('regexp_id', db.Integer, db.ForeignKey('regexps.id'))
    # )

    # citations_patterns = db.relationship('Regexp', 
    #                         secondary = topogram_regexps,
    #                         backref = db.backref('regexps', lazy = 'dynamic'), 
    #                         lazy = 'dynamic')

    status = db.Column(db.String(150))

    words = db.Column(db.Text)
    citations = db.Column(db.Text)
    networks = db.Column(db.Text)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    dataset_id = db.Column(db.Integer, db.ForeignKey('dataset.id'))

    created_at = db.Column(db.DateTime, default=db.func.now())

    def __init__(self, dataset_id, description, words_limit, citations_limit, stopwords):
        
        # print dataset_id, description, es_index_name, es_query
        # print g.user.id, g.dataset_id
        self.description = description
        
        # self.es_query = es_query
        # self.es_index_name = es_index_name
        
        self.status = "raw"
        self.stopwords = stopwords
        # self.records_count = records_count
        
        # print citations_pattern
        # self.citations_pattern = citations_pattern.id
        # print self.citations_pattern

        self.dataset_id = dataset_id
        self.user_id = g.user.id

        self.words_limit=words_limit
        self.citations_limit=citations_limit
 
    def __repr__(self):
        return '<Topogram %r>' % self.id
