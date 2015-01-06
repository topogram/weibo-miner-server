#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import errno
from flask import Flask

from flask.ext import restful

basedir = os.path.join(os.path.abspath(os.getcwd()), "src")
ASSETS_DIR=os.path.join(basedir, 'static')


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

# from src.resources.db import db
from src.resources.login import flask_bcrypt
import src.resources.admin

import src.resources.routes
import src.resources.api
import src.resources.rqueue

# import views

