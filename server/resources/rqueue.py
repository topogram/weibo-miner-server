#!/usr/bin/env python
# -*- coding: utf-8 -*-

import redis

from rq import Queue

# setup redis connection
redis_url = 'redis://localhost:6379'
conn = redis.from_url(redis_url)

q = Queue("taf", connection=conn)
