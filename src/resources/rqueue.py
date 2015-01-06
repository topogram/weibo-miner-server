#!/usr/bin/env python
# -*- coding: utf-8 -*-

from src.resources import app
from flask.ext.rq import RQ

rq = RQ(app)
