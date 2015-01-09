#!/usr/bin/env python
# -*- coding: utf-8 -*-

import redis
from server.resources.rqueue import rq

class JobQueue(object):
    """Job Queue using RQ to process data async"""
    def __init__(self, name, namespace='queue', **redis_kwargs):
        redis_conn = redis.Redis()
        self.key = '%s:%s' %(namespace, name)
        self.q = rq.Queue(name, connection=redis_conn)
        
    def enqueue(self, func, args):
        self.q.enqueue(func, args)

    def jobs(self): 
         return self.q.jobs

    def __len__(self): 
        return len(self.q)

class RedisQueue(object):
    """
    Simple Queue with Redis Backend
    from http://peter-hoffmann.com/2012/python-simple-queue-redis-queue.html
    """
    def __init__(self, name, namespace='queue', **redis_kwargs):
        """The default connection parameters are: host='localhost', port=6379, db=0"""
        self.__db= redis.Redis(**redis_kwargs)
        self.key = '%s:%s' %(namespace, name)

    def qsize(self):
        """Return the approximate size of the queue."""
        return self.__db.llen(self.key)

    def empty(self):
        """Return True if the queue is empty, False otherwise."""
        return self.qsize() == 0
    
    def clean(self):
        """Delete all elements in the queue."""
        return self.__db.delete(self.key)

    def put(self, item):
        """Put item into the queue."""
        self.__db.rpush(self.key, item)

    def get(self, block=True, timeout=None):
        """Remove and return an item from the queue. 

        If optional args block is true and timeout is None (the default), block
        if necessary until an item is available."""
        if block:
            item = self.__db.blpop(self.key, timeout=timeout)
        else:
            item = self.__db.lpop(self.key)

        if item:
            item = item[1]
        return item

    def get_nowait(self):
        """Equivalent to get(False)."""
        return self.get(False)
