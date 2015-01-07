#!/usr/bin/env python
# -*- coding: utf-8 -*-

from server import db

class Regexp(db.Model):
    """ Regular expression for different uses """
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), unique=True, nullable=False)
    regexp = db.Column(db.String(120), nullable=False)
    # citation_patterns_id = db.Column(db.Integer, db.ForeignKey('topotype.id'), index=True)
    # stop_patterns_id = db.Column(db.Integer, db.ForeignKey('topotype.id'), index=True)

    # def __init__(self, title, regexp):
    #     self.title = title
    #     self.regexp = regexp

    def __repr__(self):
        return '<Regexp (%r, %s)>' % (self.id, self.title)
