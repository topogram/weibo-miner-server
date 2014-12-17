import os
import errno
import uuid
from datetime import timedelta

from flask import Flask
from flask.ext import restful
from flask.ext.restful import reqparse, Api
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.bcrypt import Bcrypt
from flask_restful_swagger import swagger
from flask.ext.uploads import UploadSet, configure_uploads, DATA, UploadNotAllowed
from flask.ext.elasticsearch import ElasticSearch
from flask.ext.pymongo import PyMongo
from flask.ext.script import Manager
from flask.ext.migrate import Migrate, MigrateCommand

# from flask.ext.httpauth import HTTPBasicAuth
from flask.ext.login import (LoginManager, login_required, login_user, 
                         current_user, logout_user, UserMixin)
from flask.ext.principal import Principal
from flask import render_template, jsonify, send_from_directory, request, make_response

basedir = os.path.abspath(os.path.dirname(__file__))
ASSETS_DIR=os.path.join(basedir, 'static')

secret_key="a_random_secret_key_$%#!@"

app = Flask(__name__)
app.config.from_object('config')
app.secret_key = secret_key

# print app.config
app._static_folder = ASSETS_DIR
 
# flask-sqlalchemy
db = SQLAlchemy(app)
migrate = Migrate(app, db)

# flask-restful
api = swagger.docs(Api(app), apiVersion='0.1', api_spec_url="/api/v1/spec", resourcePath="/api/v1/spec")

# flask-bcrypt
flask_bcrypt = Bcrypt(app)

#Flask-Login Login Manager
login_manager = LoginManager()
app.config["REMEMBER_COOKIE_DURATION"] = timedelta(days=14)
login_manager.init_app(app)

# User Rights
principals = Principal(app)

# elastic search
elastic = ElasticSearch(app)

# flask mongo 
mongo = PyMongo(app)

# manager
manager = Manager(app)
manager.add_command('db', MigrateCommand)


# create data dir if it doesn't exist
try:
    os.mkdir(app.config['UPLOAD_FOLDER'])
except OSError, e:
    if e.errno != errno.EEXIST:
        raise e
    pass

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
    return response

# routes
@app.route('/api/v1')
def index():
    return jsonify({"name" : "topogram","version":"1.0"})

# routing for basic pages (pass routing onto the Angular app)
@app.route('/')
@app.route('/about')
@app.route('/blog')
def basic_pages(**kwargs):
    return make_response(open(os.path.join(basedir, 'templates/index.html')).read())

@app.route('/modal.html')
def modal_page(**kwargs):
    return make_response(open(os.path.join(basedir, 'templates/modal.html')).read())

# STATIC
@app.route('/js/<path:path>')
def js_static_proxy(path):
    return app.send_static_file(os.path.join('js', path))

@app.route('/css/<path:path>')
def css_static_proxy(path):
    print os.path.join('css', path)
    return app.send_static_file(os.path.join('css', path))

@app.route('/bower_components/<path:path>')
def libs_static_proxy(path):
    # send_static_file will guess the correct MIME type
    return app.send_static_file(os.path.join('bower_components', path))

@app.route('/partials/<path:path>')
def partials_static_proxy(path):
    # send_static_file will guess the correct MIME type
    return app.send_static_file(os.path.join('partials', path))

@app.route('/img/<path:path>')
def img_static_proxy(path):
    # send_static_file will guess the correct MIME type
    return app.send_static_file(os.path.join('img', path))

# special file handlers and error handlers
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'img/favicon.ico')

import views
import admin
