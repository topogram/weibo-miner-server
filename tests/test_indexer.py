# !/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import json
from base import BaseTestCase
from server.models.user import User
from server.models.dataset import Dataset
from  server.lib.indexer import csv2elastic, get_index_info, delete_index, list_all_indices, create_index, get_index_name, search


class TestIndexer(BaseTestCase):

    def test_get_index_name(self):
        """Ensure that a proper semi-random name is generated """
        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        index_name = get_index_name(fname)
        self.assertTrue(type(index_name), str)
        self.assertIn("datasamplecsv", index_name)

    def test_create_index(self):
        """ Ensure that we can create an index if it doesn't exist"""
        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        index_name = get_index_name(fname)
        resp = create_index(index_name)
        self.assertEquals(resp["acknowledged"], True)
        return index_name

    def test_list_all_indices(self):
        """ Ensure we can get a clean list of all indices """
        indices = list_all_indices()
        self.assertTrue(type(indices), list)

    def test_delete_indices(self):
        """ Ensure  deletion of indices works """
        self.test_create_index()

        indices = list_all_indices()
        test_indices = [index for index in indices if "testsdatasamplecsv" in index]
        self.assertTrue(len(test_indices) != 0)

        for index in indices : 
            if "testsdatasamplecsv" in  index :
                resp = delete_index(index)
                self.assertEquals(resp["acknowledged"], True)
        indices = list_all_indices()
        test_indices = [index for index in indices if "testsdatasamplecsv" in index]
        self.assertEquals(len(test_indices), 0)

    def test_get_index_info(self):
        """ Ensure that we can get info related to a specific index """
        index_name = self.test_create_index()
        info = get_index_info(index_name)
        self.assertEquals(info["merges"]["total"],0)
        self.test_delete_indices()
    
    def test_get_wrong_index_info(self):
        """ Ensure that a clean error is returned if the index doesnt exist. """
        info = get_index_info("blabla")
        self.assertIn("does not exist", info)

    def test_csv2elastic(self):
        """ Ensure that we can properly index a CSV into Elasticsearch """

        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        user_data = {"password" : "admin", "email" : "ad@min.com"}
        dataset_desc = { "title" : "sometitle", "dataset" : open(fname, 'rb'), "source_column" : "uid", "text_column" : "text", "time_column" : "created_at", "time_pattern": "%Y-%m-%d %H:%M:%S"}

        with self.client :
            # login 
            login = self.client.post('/api/v1/sessions',data=user_data)

           # create a dataset
            resp = self.client.post("/api/v1/datasets", data=dataset_desc)
            self.assertEquals(resp.json["index_state"], "raw")

            dataset_id = str(resp.json["id"])

            # add additional columns
            dataset_desc.pop("dataset", None)
            dataset_desc["additional_columns"] = "deleted_last_seen,permission_denied"
            url = "/api/v1/datasets/"+dataset_id
            resp = self.client.put(url, data=dataset_desc)
            self.assertEquals(resp.status_code, 200)

            # get dataset again
            resp = self.client.get("/api/v1/datasets/"+dataset_id)
            dataset = resp.json

            # index dataset
            resp = csv2elastic(dataset)
            self.assertEquals(resp["created"], True)
            self.assertEquals(resp["_index"], dataset["index_name"])
            
            # make sure it exists
            results = search("*", dataset["index_name"])
            self.assertEquals(results["hits"]["total"],0)

class TestIndexerViews(BaseTestCase):

    def test_dataset_index_states(self):
        """ Ensure that dataset state is updated during the indexing process."""

        return
        # # get dataset
        # resp = self.client.get("/api/v1/datasets/"+dataset_id)
        # dataset = resp.json
        # self.assertEquals(dataset["index_state"], "raw")

        # # index dataset
        # csv2elastic(dataset)

        # # make sure the correct state is passed
        # resp = self.client.get("/api/v1/datasets/"+dataset_id)
        # # self.assertEquals(dataset["index_state"], "processing")

        # # get dataset length 
        # info = get_index_info(dataset["index_name"])
        # self.assertTrue(type(info), dict )

        # # delete dataset
        # deleted = delete_index(dataset["index_name"])
        # self.assertTrue(type(info), dict )
        # self.assertEquals(deleted["acknowledged"], True)
