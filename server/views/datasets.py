#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import uuid
import csv
from flask import request
from flask.ext.restful import reqparse
from flask_login import login_required
from werkzeug import secure_filename

from server import app, restful, db

from server.models.dataset import Dataset 
from server.forms.dataset import DatasetCreateForm, DatasetUpdateForm
from server.serializers.dataset import DatasetSerializer
from server.lib.queue import JobQueue

from server.lib.indexer import csv2elastic, get_index_info, delete_index


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
        datasets = Dataset.query.all()
        return DatasetSerializer(datasets, many=True).data


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
        safename = "".join([c for c in fileName if c.isalpha() or c.isdigit() or c==' ']).rstrip()
        es_index_name=(safename + "_"+ str(uuid.uuid4())).lower()
        index_state = "raw"

        dataset = Dataset(form.title.data, form.description.data, str(file_path),es_index_name, index_state, source_column=form.source_column.data, text_column=form.text_column.data, time_column=form.time_column.data, time_pattern=form.time_pattern.data)
        db.session.add(dataset)
        db.session.commit()

        return DatasetSerializer(dataset).data, 201

class DatasetView(restful.Resource):

    @login_required
    def delete(self, id):
        dataset = Dataset.query.filter_by(id=id).first()
        if dataset is None: return 404

        d= DatasetSerializer(dataset).data
        if d["index_state"] == "done" : delete_index(d["index_name"])

        db.session.delete(dataset)
        db.session.commit()
        return 204


    @login_required
    def put(self, id):

        print type(id)
        form = DatasetUpdateForm()
        if not form.validate_on_submit():
            return form.errors, 422
        print "validated"
        # check if the record exists in the DB
        dataset = Dataset.query.filter_by(id=id).first()
        if dataset is None: return 404

        # validate values
        csv_corpus = CSVCorpus(form.filepath.data,
                                source_column=form.source_column.data,
                                text_column=form.text_column.data,
                                timestamp_column=form.time_column.data,
                                time_pattern=form.time_pattern.data)
        try :
            csv_corpus.validate()
        except ValueError, e:
            return e.message, 422

        print form.language.data
        
        # add new values 
        dataset.source_column = form.source_column.data
        dataset.text_column = form.text_column.data
        dataset.time_column = form.time_column.data
        dataset.time_pattern = form.time_pattern.data
        dataset.language = form.language.data
        db.session.commit() #save changes

        # get the modified version
        dataset = Dataset.query.filter_by(id=id).first()
        print DatasetSerializer(dataset).data

        return 204, 

    @login_required
    def get(self, id):
        """
        GET 
        a Single dataset per ID

        """

        d = Dataset.query.filter_by(id=id).first()
        if d is None : return 404 # handle wrong ID request

        dataset= DatasetSerializer(d).data
        
        # add file info
        csv_corpus = CSVCorpus(dataset["filepath"])

        dataset["csv"] = {}
        dataset["csv"]["headers"] = csv_corpus.headers
        dataset["csv"]["encoding"] = csv_corpus.encoding
        dataset["csv"]["sample"] = csv_corpus.raw_sample(10)

        # add elasticsearch info
        if dataset["index_state"] == "done" :
            es_info= get_index_info(dataset["index_name"])
            dataset["records_count"] = es_info["indices"][dataset["index_name"]]["docs"]["num_docs"]

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


class DatasetEsView(restful.Resource) :
    @login_required
    def get(self, id):
        """" 
        Index data into elasticsearch
        Works as a state machine based on a job queue
        """
        
        d = Dataset.query.filter_by(id=id).first()
        dataset = DatasetSerializer(d).data

        index_state = dataset["index_state"]
        print index_state

        # ensure that the index exists, if not reset state and recreate
        try : 
            get_index_info(dataset["index_name"])
        except :
            index_state ="raw"

        if index_state == "raw" :
            csv2elastic(dataset)
            return { "status": "started"}, 201

        elif index_state == "processing" :
            es_info= get_index_info(dataset["index_name"])
            es_info["status"] = "processing"
            return es_info, 201

        elif index_state == "done" :
            es_info= get_index_info(dataset["index_name"])
            es_info["status"] = "done"
            return es_info, 200

        return 201
        # return {
            # "index_name" : dataset["index_name"],
            # "count" : es_info["indices"][dataset["index_name"]]["docs"]["num_docs"]
            # "info" : es_info["indices"][dataset["index_name"]]
            # "info" : es_info[""]
            # }