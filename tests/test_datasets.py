# !/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import json
import csv

from base import BaseTestCase
from flask.ext.login import current_user
from src.models.user import User
from src.models.dataset import Dataset
from src.resources import bcrypt
# from topogram.corpora.csv import CSVCorpus

class TestDatasetViews(BaseTestCase):

    def test_a(self):
        """ useless test to fix the weird bug on earth 
        namely : the first test use another database """
        users = User.query.all() # results from another db
        self.assertTrue(True)

    # Ensure datasets API return an index of all datasets  
    def test_get_datasets(self):
        """ Ensure datasets API return an index of all datasets """
        data = {"password" : "admin", "email" : "ad@min.com"}
        with self.client :
            self.client.post('/api/v1/sessions',data=data)
            login = self.client.post('/api/v1/sessions',data=data)
            resp = self.client.get("/api/v1/datasets")
            self.assertEqual(resp.status_code,  200)
            self.assertTrue(resp.json ==  [])

    # Ensure datasets API is accessible just to logged in users  
    def test_requires_logged_in(self):
        """ Ensure datasets API is accessible just to logged in users """
        self.client.delete("/api/v1/sessions")
        resp = self.client.get("/api/v1/datasets")
        self.assertEqual(resp.status_code,  401)

    # Ensure uploading a dataset works
    def test_upload_dataset(self):
        """ Ensure uploading a dataset works """
        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        data = { "title" : "sometitle", "dataset" : open(fname, 'rb'), "source_column" : "somesource", "text_column" : "sometext", "time_column" : "sometime", "time_pattern": "somepattern"}
        resp = self.client.post("/api/v1/datasets", data=data)
        dataset = resp.json
        self.assertEqual(resp.status_code,  201)
        self.assertEqual(dataset["id"], 1)
        self.assertEqual(dataset["source_column"], "somesource")
        self.assertEqual(dataset["text_column"], "sometext")
        self.assertEqual(dataset["time_column"], "sometime")
        self.assertEqual(dataset["time_pattern"], "somepattern")

    # Ensure default values are available when uploading dataset
    def test_get_dataset(self):
        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        data = { "title" : "sometitle", "dataset" : open("./tests/data/sample.csv", 'rb') }
        resp = self.client.post("/api/v1/datasets", data=data)

        resp = self.client.get("/api/v1/datasets/1")
        dataset = resp.json
        # print resp.json
        self.assertEqual(dataset["id"], 1)
        self.assertEqual(dataset["title"], "sometitle")
        self.assertEqual(dataset["index_state"], "raw")
        self.assertEqual(dataset["source_column"], "source")
        self.assertEqual(dataset["text_column"], "text")

    # Ensure uploading wrong data returns error
    def test_upload_wrong_data(self):
        data = { "title" : ""}
        resp = self.client.post("/api/v1/datasets", data=data, )
        self.assertEqual(resp.status_code,  422)
        self.assertIn("field is required",resp.data)

    # Ensure deleting dataset works properly
    def test_delete_dataset(self):
        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        data = { "title" : "sometitle", "dataset" : open("./tests/data/sample.csv", 'rb') }
        self.client.post("/api/v1/datasets", data=data)
        resp = self.client.delete("/api/v1/datasets/1")
        self.assertEqual(resp.json,  204)
        d = self.client.get("/api/v1/datasets/1")
        self.assertEqual(d.json,  404)

    # Ensure access to a smaple of a dataset
    def test_dataset_sample(self):
        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        data = { "title" : "sometitle", "dataset" : open("./tests/data/sample.csv", 'rb') }
        self.client.post("/api/v1/datasets", data=data)
        resp = self.client.get("/api/v1/datasets/1/sample")
        self.assertEqual(len(resp.json),10)
        self.assertEqual(type(resp.json[0]),dict)
        self.assertEqual(resp.status_code,  201)


class TestDatasetProcessing(BaseTestCase):

    def test_a(self):
        """ useless test to fix the weird bug on earth 
        namely : the first test use another database """
        users = User.query.all() # results from another db
        self.assertTrue(True)


    # Ensure datasets is added to the processing queue while uploaded
    def test_process_after_upload(self): 
        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        data = { "title" : "sometitle", "dataset" : open("./tests/data/sample.csv", 'rb') }
        self.client.post("/api/v1/datasets", data=data)

        resp = self.client.get("/api/v1/datasets/1/index")
        print resp.data
        self.assertIn("job started", resp.data )

        resp = self.client.get("/api/v1/datasets/1/index")
        print resp.data
        self.assertIn("job ongoing", resp.data )

        self.assertEqual(resp.status_code, 401)
