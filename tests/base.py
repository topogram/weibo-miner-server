#!/usr/bin/env python
# -*- coding: utf-8 -*-

import time
import unittest
from flask.ext.testing import TestCase
from flask.ext.migrate import upgrade, downgrade

from src.resources import app, db
from src.models.user import User

import logging
logger = logging.getLogger('topogram-server.tests')

SQLALCHEMY_DATABASE_URI = "mysql+pymysql://topogram:topo2014@localhost/test_topogram"
TESTING=True

class BaseTestCase(TestCase):
    """A base test case."""

    def setUp(self):

        logger.info("setting up database : %s"%app.config["SQLALCHEMY_DATABASE_URI"])
        # upgrade(revision="head")
        db.create_all()
        with self.client:
            data = {"password" : "admin", "invite" : "invite", "email" : "ad@min.com"}
            resp = self.client.post("/api/v1/users", data=data)

    def create_app(self):
        app.config["SQLALCHEMY_DATABASE_URI"] = SQLALCHEMY_DATABASE_URI
        app.config["TESTING"] = TESTING
        return app

    def tearDown(self):
        logger.info("downgrading database")
        # downgrade(revision="base")
        db.session.remove()
        db.drop_all()
