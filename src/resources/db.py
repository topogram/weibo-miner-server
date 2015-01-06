#!/usr/bin/env python
# -*- coding: utf-8 -*-

# from flask.ext.pymongo import PyMongo
from flask.ext.sqlalchemy import SQLAlchemy


from src.resources import app

# flask-sqlalchemy
db = SQLAlchemy(app)

# flask mongo 
# mongo = PyMongo(app)
