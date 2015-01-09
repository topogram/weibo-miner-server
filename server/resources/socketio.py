#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import time
import json

from gevent import monkey
monkey.patch_all()

from flask import render_template,session
from flask.ext.socketio import SocketIO, emit

from server import app
from server.lib.queue import RedisQueue

# socket.io
socket = SocketIO(app)

@socket.on('connect')
def test_connect(message):
    print  "socket io connected"

@socket.on('progress')
def state_progress(message):
        # print 'point'
        q = RedisQueue('topogram:'+message["index_name"])
        point = json.loads(q.get())
        # point=q.get()
        print point, type(point)
        socket.emit("progress", json.dumps(point))
