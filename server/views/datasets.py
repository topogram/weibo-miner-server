#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import csv
from flask import request
from flask.ext.restful import reqparse
from flask_login import login_required, current_user
from werkzeug import secure_filename
from bson import json_util

from pymongo import DESCENDING, ASCENDING
from server import app, restful, db, mongo

from server.models.dataset import Dataset
from server.forms.dataset import DatasetCreateForm, DatasetUpdateForm
from server.serializers.dataset import DatasetSerializer
from server.lib.queue import JobQueue
from server.lib.db_indexer import build_query

# from server.lib.indexer import csv2elastic, get_index_info, delete_index, get_index_name

from server.lib.db_indexer import process_dataset, get_index_name, get_data_by_search_word

from topogram.utils import any2utf8
from topogram.corpora.csv_file import CSVCorpus

class DatasetListView(restful.Resource):

    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('title', type = str, location = 'json')
        self.reqparse.add_argument('description', type = str, location = 'json')
        self.reqparse.add_argument('done', type = bool, location = 'json')

    @login_required
    def get(self):
        datasets =  current_user.datasets.all()
        datasets_pointing_to_existing_files = [d for d in datasets if os.path.isfile(d.filepath) ]
        return DatasetSerializer(datasets_pointing_to_existing_files, many=True).data

    @login_required
    def post(self):
        form = DatasetCreateForm()
        if not form.validate_on_submit():
            return form.errors, 422

        # add file
        fileName = secure_filename(form.dataset.data.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], fileName)
        form.dataset.data.save(file_path)

        # check encoding
        try :
            csv_corpus = CSVCorpus(file_path)
            if csv_corpus.encoding != 'utf-8':
                return "Bad file encoding. Please use UTF-8 for better compatibility.", 422
        except TypeError:
            return "Bad file encoding. Please use UTF-8 for better compatibility.", 422

        #  elasticsearch index
        index_state = "raw"
        es_index_name = get_index_name(fileName)

        dataset = Dataset(form.title.data,
                          form.description.data,
                          str(file_path),
                          es_index_name,
                          index_state,
                          source_column=form.source_column.data, text_column=form.text_column.data, time_column=form.time_column.data, time_pattern=form.time_pattern.data)
        db.session.add(dataset)
        db.session.commit()

        return DatasetSerializer(dataset).data, 201

class DatasetView(restful.Resource):

    @login_required
    def delete(self, id):
        dataset = Dataset.query.filter_by(id=id).first()
        if dataset is None: return 404

        # check user rights
        if dataset.user.id != current_user.id : return 401

        d= DatasetSerializer(dataset).data
        # if d["index_state"] == "done" : delete_index(d["index_name"])

        db.session.delete(dataset)
        db.session.commit()
        return 204

    @login_required
    def put(self, id):

        form = DatasetUpdateForm()
        if not form.validate_on_submit():
            return form.errors, 422

        # check if the record exists in the DB
        dataset = Dataset.query.filter_by(id=id).first()
        if dataset is None: return 404

        # check rights
        if dataset.user.id != current_user.id : return 401

        if len(form.additional_columns.data) :
            additional_columns =  any2utf8(form.additional_columns.data)
        else :
            additional_columns = None

        # validate values
        csv_corpus = CSVCorpus(dataset.filepath,
                                source_column=form.source_column.data,
                                text_column=form.text_column.data,
                                timestamp_column=form.time_column.data,
                                time_pattern=form.time_pattern.data,
                                additional_columns=additional_columns)

        try :
            csv_corpus.validate()
        except ValueError, e:
            return e.message, 422

        # add new values
        dataset.source_column = form.source_column.data
        dataset.text_column = form.text_column.data
        dataset.time_column = form.time_column.data
        dataset.time_pattern = form.time_pattern.data
        dataset.language = form.language.data
        dataset.additional_columns = additional_columns
        db.session.commit() #save changes

        # get the modified version
        dataset = Dataset.query.filter_by(id=id).first()

        return 204,

    @login_required
    def get(self, id):
        """
        GET
        a Single dataset per ID

        """

        d = Dataset.query.filter_by(id=id).first()
        if d is None : return 404 # handle wrong ID request

        # check rights
        if d.user.id != current_user.id : return 401

        dataset= DatasetSerializer(d).data

        # add file info
        csv_corpus = CSVCorpus(dataset["filepath"])

        dataset["csv"] = {}
        dataset["csv"]["headers"] = csv_corpus.headers
        dataset["csv"]["encoding"] = csv_corpus.encoding
        dataset["csv"]["sample"] = csv_corpus.raw_sample(10)

        # add elasticsearch info
        # if dataset["index_state"] == "done" :
        #     es_info= get_index_info(dataset["index_name"])
        #     dataset["records_count"] = es_info["docs"]["num_docs"]

        return dataset

class DatasetSampleView(restful.Resource):
    @login_required
    def get(self, id):
        """
        GET
        return a sample of x lines from a dataset (default is 10)

        args : Dataset ID (required), optional
        returns : a dict

        """
        dataset = Dataset.query.filter_by(id=id).first()
        csv_corpus = CSVCorpus(dataset.filepath)

        csv_sample = csv_corpus.raw_sample(50)
        return csv_sample, 201

class DatasetProcessView(restful.Resource) :
    @login_required
    def get(self, id):
        """
        Use user-defined model to index data into the db
        """

        d = Dataset.query.filter_by(id=id).first()
        dataset = DatasetSerializer(d).data

        jobs_keys = process_dataset(dataset)
        return jobs_keys

class DatasetSizeView(restful.Resource) :
    @login_required
    def get(self, id):
        d = Dataset.query.filter_by(id=id).first()
        dataset = DatasetSerializer(d).data

        count = mongo.db[dataset["index_name"]].count()
        return {"index_name" : dataset["index_name"], "count" : count}

class DatasetPaginateView(restful.Resource) :
    def __init__(self):
        parser = reqparse.RequestParser()
        parser.add_argument('sort_order', type=str, help='Sort value (1 is up, -1 is down)')
        parser.add_argument('sort_column', type=unicode, help='Sort DB field')
        parser.add_argument('q', type=unicode, help='Search query')
        parser.add_argument('stopwords', type=unicode, help='Words to exclude')
        self.args = parser.parse_args()

    @login_required
    def get(self, id, start, qty):
        d = Dataset.query.filter_by(id=id).first()
        dataset = DatasetSerializer(d).data
        sort_column = "_id" # default value

        # search term
        q =self.args["q"]
        if q is not None : q.split(",")

        # stopwords
        stopwords =self.args["stopwords"]
        if stopwords is not None : stopwords = eval(stopwords)

        query = build_query(q, stopwords)

        # sorting
        sort_column = self.args["sort_column"]
        sort_order_num = self.args["sort_order"]

        if sort_order_num  == "1" : sort_order = ASCENDING
        else : sort_order = DESCENDING

        print sort_column

        if sort_column is None :
            results = mongo.db[dataset["index_name"]].find(query).skip(start).limit(start+qty)
        else :
            results = mongo.db[dataset["index_name"]].find(query).sort(sort_column, sort_order).skip(start).limit(start+qty)

        return json_util.dumps(results)

class DatasetSearchWordView(restful.Resource):

    def __init__(self):
        parser = reqparse.RequestParser()
        parser.add_argument('sort', type=str, help='Sort by DB field')
        parser.add_argument('q', type=unicode, help='Search query')
        parser.add_argument('stopwords', type=unicode, help='Words to exclude')
        self.args = parser.parse_args()

    @login_required
    def get(self, id):
        d = Dataset.query.filter_by(id=id).first()
        dataset = DatasetSerializer(d).data

        # search term
        q =self.args["q"]
        if q is not None : q.split(",")

        # stopwords
        stopwords =self.args["stopwords"]
        if stopwords is not None : stopwords = eval(stopwords)

        query = build_query(q, stopwords)

        records = mongo.db[dataset["index_name"]].find(query)

        data = {}
        data["count"] = records.count()

        return data

# class DatasetEsView(restful.Resource) :
#     @login_required
#     def get(self, id):
#         """"
#         Index data into elasticsearch
#         Works as a state machine based on a job queue
#         """

#         d = Dataset.query.filter_by(id=id).first()
#         dataset = DatasetSerializer(d).data

#         index_state = dataset["index_state"]

#         # ensure that the index exists, if not reset state and recreate
#         try :
#             get_index_info(dataset["index_name"])
#         except :
#             index_state ="raw"

#         if index_state == "raw" :
#             csv2elastic(dataset)
#             return { "status": "started"}, 201

#         elif index_state == "processing" :
#             es_info= get_index_info(dataset["index_name"])
#             es_info["status"] = "processing"
#             return es_info, 201

#         elif index_state == "done" :
#             es_info= get_index_info(dataset["index_name"])
#             es_info["status"] = "done"
#             return es_info, 200

#         return 201
#         # return {
#             # "index_name" : dataset["index_name"],
#             # "count" : es_info["indices"][dataset["index_name"]]["docs"]["num_docs"]
#             # "info" : es_info["indices"][dataset["index_name"]]
#             # "info" : es_info[""]
#             # }
