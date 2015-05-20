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
from flask.ext.rq import get_queue
from server.resources.rqueue import conn
from rq.job import Job

# socket.io
socket = SocketIO(app)

def send_updates(data):
    print "hahah"
    socket.emit("progress", data)

@socket.on('connect')
def test_connect(message):
    print  "socket io connected"
    emit('my response', json)

@socket.on('job')
def job_info(message):

        job_keys = message["jobs"]
        # print job_keys
        jobs=[]
        for job_key in job_keys:
            job_key = str(job_key).replace("rq:job:", "")
            job = Job.fetch(job_key, connection=conn)
            # print job
            jobs.append(job.is_finished)
        # print jobs
        socket.emit("job_progress", jobs)



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
