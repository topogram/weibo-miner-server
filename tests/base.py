#!/usr/bin/env python
# -*- coding: utf-8 -*-

import time
import unittest
from flask.ext.testing import TestCase
from flask.ext.migrate import upgrade, downgrade

from src.resources import app
from src.resources.db import db

from src.models.user import User

import logging
logger = logging.getLogger('topogram-server.tests.app')

class BaseTestCase(TestCase):
    """A base test case."""

    def setUp(self):

        logger.info("setting up database : %s"%app.config["SQLALCHEMY_DATABASE_URI"])

        # upgrade(revision="head")
        db.create_all()
        db.session.commit()

        data = {"password" : "admin", "invite" : "invite", "email" : "ad@min.com"}
        resp = self.client.post("/api/v1/users", data=data)

    def create_app(self):
        app.config.from_object('test_config')
        secret_key="a_random_secret_key_$%#!@"
        app.secret_key = secret_key
        return app

    # def test_write_user_in_db(self):
        # self.assertRaises(ValueError, lambda : User())
        # user = User(password="password")
        # self.db.session.add(user)
        # self.db.session.commit()

    def tearDown(self):
        logger.info("downgrading database")
        # downgrade(revision="base")
        db.session.remove()
        db.drop_all()
