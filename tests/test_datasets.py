# !/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import json
import csv
import time
from base import BaseTestCase
from flask.ext.login import current_user
from server.models.user import User
from server.models.dataset import Dataset
from server import bcrypt
# from topogram.corpora.csv import CSVCorpus

class TestDatasetViews(BaseTestCase):

    def test_a(self):
        """ useless test to fix the weird bug on earth 
        namely : the first test use another database """
        users = User.query.all() # results from another db
        self.assertTrue(True)

    def test_get_datasets(self):
        """ Ensure datasets API return an index of all datasets """
        data = {"password" : "admin", "email" : "ad@min.com"}
        with self.client :
            self.client.post('/api/v1/sessions',data=data)
            login = self.client.post('/api/v1/sessions',data=data)
            resp = self.client.get("/api/v1/datasets")
            self.assertEqual(resp.status_code,  200)
            self.assertTrue(resp.json ==  [])

    def test_requires_logged_in(self):
        """ Ensure datasets API is accessible just to logged in users """
        self.client.delete("/api/v1/sessions")
        resp = self.client.get("/api/v1/datasets")
        self.assertEqual(resp.status_code,  401)

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

    def test_default_values_dataset(self):
        """Ensure default values are available when uploading dataset"""
        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        data = { "title" : "sometitle", "dataset" : open("./tests/data/sample.csv", 'rb') }
        resp = self.client.post("/api/v1/datasets", data=data)

        resp = self.client.get("/api/v1/datasets/1")
        dataset = resp.json
        self.assertEqual(dataset["id"], 1)
        self.assertEqual(dataset["title"], "sometitle")
        self.assertEqual(dataset["index_state"], "raw")
        self.assertEqual(dataset["source_column"], "")
        self.assertEqual(dataset["text_column"], "")

    def test_upload_wrong_data(self):
        """ Ensure uploading wrong data returns error """
        data = { "title" : ""}
        resp = self.client.post("/api/v1/datasets", data=data, )
        self.assertEqual(resp.status_code,  422)
        self.assertIn("field is required",resp.data)

    def test_delete_dataset(self):
        """ Ensure deleting dataset works properly """
        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        data = { "title" : "sometitle", "dataset" : open("./tests/data/sample.csv", 'rb') }
        self.client.post("/api/v1/datasets", data=data)
        resp = self.client.delete("/api/v1/datasets/1")
        self.assertEqual(resp.json,  204)
        d = self.client.get("/api/v1/datasets/1")
        self.assertEqual(d.json,  404)

    def test_dataset_sample(self):
        """ Ensure access to a sample of a dataset """

        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        data = { "title" : "sometitle", "dataset" : open("./tests/data/sample.csv", 'rb') }
        self.client.post("/api/v1/datasets", data=data)
        resp = self.client.get("/api/v1/datasets/1/sample")

        self.assertEqual(len(resp.json),50)
        self.assertEqual(type(resp.json[0]),dict)
        self.assertEqual(resp.status_code,  201)

    def test_sample_zh(self):
        """ Ensure access that dataset sample is unicode/utf8 proof """

        fname = os.path.join(os.path.dirname(__file__), "data/zh_sample.csv")
        data = { "title" : "sometitle", "dataset" : open("./tests/data/sample.csv", 'rb') }
        self.client.post("/api/v1/datasets", data=data)
        resp = self.client.get("/api/v1/datasets/1/sample")
        self.assertEqual(len(resp.json),50)
        self.assertEqual(type(resp.json[0]),dict)
        self.assertEqual(resp.status_code,  201)

    def test_wrong_update_record(self):
        """ Ensure that records can be updated only with correct values """

        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")

        data = { "title" : "sometitle", "dataset" : open(fname, 'rb') }
        self.client.post("/api/v1/datasets", data=data)

        resp = self.client.put("/api/v1/datasets/1", data={"title" :"sometitle", "source_column" : "some_source_column","text_column" : "some_text_column","time_column" : "some_time_column","time_pattern" : "some_time_pattern"})

        self.assertEqual(resp.status_code, 422)


    def test_wrong_time_pattern(self):
        """ Ensure that records can be updated only with the right time pattern """

        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        data = { "title" : "sometitle", "dataset" : open(fname, 'rb') }
        self.client.post("/api/v1/datasets", data=data)

        resp = self.client.put("/api/v1/datasets/1", data={"title" :"sometitle", "source_column" : "source","text_column" : "text","time_column" : "created_at","time_pattern" : "%Y-%m-%dT%H:%M:%S"})

        self.assertEqual(resp.status_code, 422)
        self.assertIn("time data", resp.data)
        self.assertIn("does not match format", resp.data)

    def test_update_ok(self):
        """ Ensure that records can be updated with correct values """

        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        data = { "title" : "sometitle", "dataset" : open(fname, 'rb') }
        self.client.post("/api/v1/datasets", data=data)

        resp = self.client.put("/api/v1/datasets/1", data={"title" :"sometitle", "source_column" : "source","text_column" : "text","time_column" : "created_at", "time_pattern" : "%Y-%m-%d %H:%M:%S"})

        self.assertEqual(resp.status_code, 200)


class TestDatasetProcessing(BaseTestCase):

    def test_init(self):
        """ useless test to fix the weird bug on earth 
        namely : the first test use another database """
        users = User.query.all() # results from another db
        self.assertTrue(True)


    def test_process_data(self): 
        """ Ensure datasets is added to the processing queue while uploaded """
        user_data = {"password" : "admin", "email" : "ad@min.com"}
        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        dataset_desc = { "title" : "sometitle", "dataset" : open(fname, 'rb'), "source_column" : "uid", "text_column" : "text", "time_column" : "created_at", "time_pattern": "%Y-%m-%d %H:%M:%S"}

        with self.client :
            login = self.client.post('/api/v1/sessions',data=user_data)
            resp = self.client.post("/api/v1/datasets", data=dataset_desc)
            dataset = resp.json

            resp = self.client.get("/api/v1/datasets/"+ str(dataset["id"]) + "/index")
            self.assertIn("started", resp.data )

            resp = self.client.get("/api/v1/datasets/"+ str(dataset["id"])+"/index")
            self.assertIn("done", resp.json["status"] )

        self.assertEqual(resp.status_code, 200)
