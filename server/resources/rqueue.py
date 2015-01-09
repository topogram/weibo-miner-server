#!/usr/bin/env python
# -*- coding: utf-8 -*-

from server import app
from flask.ext.rq import RQ

rq = RQ(app)
