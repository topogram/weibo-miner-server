# !/usr/bin/env python
# -*- coding: utf-8 -*-

import os
from base import BaseTestCase
from server.models.user import User
from server.models.dataset import Dataset
from  server.lib.indexer import csv2elastic, get_index_info, delete_index

class TestIndexer(BaseTestCase):

    def test_csv2elastic(self):
        #post a 
        fname = os.path.join(os.path.dirname(__file__), "data/sample.csv")
        user_data = {"password" : "admin", "email" : "ad@min.com"}
        dataset_desc = { "title" : "sometitle", "dataset" : open(fname, 'rb'), "source_column" : "uid", "text_column" : "text", "time_column" : "created_at", "time_pattern": "%Y-%m-%d %H:%M:%S"}

        with self.client :
            login = self.client.post('/api/v1/sessions',data=user_data)
            
            resp = self.client.post("/api/v1/datasets", data=dataset_desc)
            dataset = resp.json
            print dataset
            self.assertEquals(dataset["index_state"], "raw")
            
            # create dataset
            csv2elastic(dataset)
            
            resp = self.client.get("/api/v1/datasets/"+str(dataset["id"]))
            dataset = resp.json
            print dataset
            self.assertEquals(dataset["index_state"], "done")

            # get dataset length 
            info = get_index_info(dataset["index_name"])
            # print info

            deleted = delete_index(dataset["index_name"])
            self.assertEquals(True, False)
