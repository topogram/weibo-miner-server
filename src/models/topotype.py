#!/usr/bin/env python
# -*- coding: utf-8 -*-

from src.resources.db import db

class Topotype(db.Model):
    """Topotype are data mining profiles to extract topograms from data"""
    id = db.Column(db.Integer, primary_key=True)

    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    
    # main characteristics
    languages = db.Column(db.String(120), nullable=False) # list
    text_column = db.Column(db.String(120)) # text colum name

    # time
    timestamp_column = db.Column(db.String(120)) # column name
    time_pattern = db.Column(db.String(120)) # string like "%Y-%m-%d %H:%M:%S"

    # stop words and patterns
    stopwords = db.Column(db.Text) # list
    ignore_citations = db.Column(db.String(120)) # list
    stop_patterns = db.relationship('Regexp', backref='stop_patterns', lazy='dynamic', foreign_keys='Regexp.stop_patterns_id')# regexp ids

    # citations
    source_column = db.Column(db.String(120)) # source colum name
    dest_column = db.Column(db.String(120)) # dest colum name
    citation_patterns = db.relationship('Regexp', backref='citation_patterns', lazy='dynamic',foreign_keys='Regexp.citation_patterns_id') # regexp ids


    # backilnk
    # datasets = db.relationship('Dataset', backref='topotype_id', lazy='dynamic')
    datasets = db.relationship('Dataset', backref='topotype', lazy='dynamic', foreign_keys="Dataset.topotype_id")


    def __repr__(self):
        return '<Topotype (%r, %s)>' % (self.id, self.title)
