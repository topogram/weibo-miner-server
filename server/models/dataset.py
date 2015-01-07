#!/usr/bin/env python
# -*- coding: utf-8 -*-

from server import db
from flask import g

class Dataset(db.Model):
    """
    Model for Dataset objects.
    
    """
    "Datasets (csv files) ..."
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=db.func.now())

    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)

    # file
    filepath = db.Column(db.String(120))

    # elasticsearch
    index_name = db.Column(db.String(150))
    index_state = db.Column(db.String(150), default="raw", nullable=False)

    # CSV structure 
    source_column = db.Column(db.String(120), default="source")
    text_column = db.Column(db.String(120), default="text")
    time_column = db.Column(db.String(120), default="created_at") 
    time_pattern = db.Column(db.String(120), default="%Y-%m-%d %H:%M:%S") 

    # foreign keys
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    topograms = db.relationship('Topogram', backref='dataset', lazy='dynamic')

    def __init__(self, title, description, filepath, index_name, index_state, source_column="source", text_column="text", time_column="created_at", time_pattern="%Y-%m-%d %H:%M:%S"):
        self.title = title
        self.description = description
        self.index_name = index_name
        self.index_state = index_state
        self.filepath = filepath
        self.source_column = source_column
        self.text_column = text_column
        self.time_column = time_column
        self.time_pattern = time_pattern
        self.user_id = g.user.id

    def __repr__(self):
        return '<Dataset %r>' % self.title

