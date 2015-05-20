#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import time
import json

# from gevent import monkey, spawn
# monkey.patch_all()

from flask import render_template,session
from flask.ext.socketio import SocketIO, emit, send

from server import app
# from server.lib.db_indexer import get_words_co_occurences


# socket.io
socket = SocketIO(app)

@socket.on('connect')
def test_connect(message):
    print  "socket io connected"
    emit('my response', json)

@socket.on('message')
def handle_message(message):
    send(message)

# @socket.on('getWordsGraph')
# def get_words_graph(message):
#     data = message["data"]
#     # print data.keys()
#     print "processing word graph"

#     # job queue
#     q = get_queue("taf")
#     q.enqueue(process_words_co_occurences, data["dataset"])
#     # emit('wordsGraphReady', words)

# @socket.on('progress')
# def state_progress(message):
#         # print 'point'
#         # q = RedisQueue('topogram:'+message["index_name"])
#         # point = json.loads(q.get())
#         # # point=q.get()
#         # print point, type(point)
#         socket.emit("progress", json.dumps(point))
