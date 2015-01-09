#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import errno
from datetime import timedelta

from flask import Flask
from flask.ext import restful
from flask.ext.bcrypt import Bcrypt
from flask.ext.login import LoginManager
from flask.ext.principal import Principal
from flask.ext.sqlalchemy import SQLAlchemy

basedir = os.path.join(os.path.abspath(os.getcwd()), "server")
ASSETS_DIR = os.path.join(os.getcwd(), "client")

app = Flask(__name__)

# config
app.config.from_object('config')
secret_key="a_random_secret_key_$%#!@"
app.secret_key = secret_key
app._static_folder = ASSETS_DIR

# create uploads dir if it doesn't exist
try:
    os.mkdir(app.config['UPLOAD_FOLDER'])
except OSError, e:
    if e.errno != errno.EEXIST:
        raise e
    pass

# flask-sqlalchemy
db = SQLAlchemy(app)

# flask-bcrypt
bcrypt = Bcrypt(app)

#Flask-Login Login Manager
login_manager = LoginManager()
app.config["REMEMBER_COOKIE_DURATION"] = timedelta(days=14)
login_manager.init_app(app)

# User Rights
principals = Principal(app)

import server.resources.admin
import server.resources.routes
import server.resources.api
import server.resources.rqueue