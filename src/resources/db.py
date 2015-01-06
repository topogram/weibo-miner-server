#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask.ext.pymongo import PyMongo
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.migrate import Migrate, MigrateCommand
from flask.ext.script import Manager

from src.resources import app

# flask-sqlalchemy
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# migrate with manager
manager = Manager(app)
manager.add_command('db', MigrateCommand)

# flask mongo 
mongo = PyMongo(app)
