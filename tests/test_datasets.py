#!/usr/bin/env python
# -*- coding: utf-8 -*-

# import json
# from base import AppTest

# class TestDatasetViews(AppTest):

#     def login(self):
#         # add a user
#         return self.client

#     def test_requires_logged_in(self):
#         resp = self.client.get("/api/v1/datasets")
#         self.assertEqual(resp.status_code,  401)
#         resp = self.client.post("/api/v1/datasets")
#         self.assertEqual(resp.status_code,  401)

#     def test_get_datasets(self):
#         new_user = {"password" : "password", "invite" : "invite", "email" : "test@test.com"}
#         resp = self.client.post("/api/v1/users", data=new_user)
#         print resp

#         # new_session = {"password" : "password", "email" : "test@test.com"}
#         # resp = self.client.post("/api/v1/sessions", data=new_session)
#         # print resp.json

#         resp = self.client.get("/api/v1/datasets")
#         print resp.json
#         self.assertEqual(resp.status_code,  201)


