#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
from flask import render_template, jsonify, send_from_directory, request, make_response
from flask.ext.login import current_user

from server import app, basedir

# default
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
    # print os.path.join('css', path)
    return app.send_static_file(os.path.join('css', path))

@app.route('/dist/<path:path>')
def dist_static_proxy(path):
    # print os.path.join('css', path)
    return app.send_static_file(os.path.join('dist', path))

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

@app.errorhandler(404)
def not_found(error=None):
    message = {
            'status': 404,
            'message': 'Not Found: ' + request.url,
    }
    resp = jsonify(message)
    resp.status_code = 404

    return resp
