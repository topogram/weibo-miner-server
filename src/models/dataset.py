#!/usr/bin/env python
# -*- coding: utf-8 -*-

from src.resources.db import db
from flask import g

class Dataset(db.Model):
    """
    Model for Dataset objects.
    
    """
    "Datasets (csv files) ..."
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    filepath = db.Column(db.String(120))
    index_name = db.Column(db.String(150))
    created_at = db.Column(db.DateTime, default=db.func.now())

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    topotype_id = db.Column(db.Integer, db.ForeignKey('topotype.id'), nullable=False)

    topograms = db.relationship('Topogram', backref='dataset', lazy='dynamic')

    # topotype = db.relationship('Topotype', backref='dataset', lazy='dynamic')

    def __init__(self, title, topotype_id, description, index_name, filepath):
        print topotype_id, type(topotype_id)
        self.title = title
        self.description = description
        self.topotype_id = int(topotype_id)
        self.filepath = filepath
        self.index_name = index_name
        self.user_id = g.user.id

    def __repr__(self):
        return '<Dataset %r>' % self.title
