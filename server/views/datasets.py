#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import uuid
import csv
from flask import request
from flask_login import login_required
from werkzeug import secure_filename

from server import app, restful, db
from server.models.dataset import Dataset 
from server.forms.dataset import DatasetCreateForm
from server.serializers.dataset import DatasetSerializer
from server.lib.queue import JobQueue
from server.lib.elastic import get_index_info, delete_index
from topogram.utils import any2utf8

jobs = JobQueue("taf")

class DatasetListView(restful.Resource):

    @login_required
    def get(self):
        datasets = Dataset.query.all()
        return DatasetSerializer(datasets, many=True).data
 
    @login_required
    def post(self):
        form = DatasetCreateForm()
        if not form.validate_on_submit():
            return form.errors, 422

        # enforce default values 
        if form.source_column.data == "" :  form.source_column.data = None
        if form.text_column.data == "" :  form.text_column.data = None
        if form.time_column.data == "" :  form.time_column.data = None
        if form.time_pattern.data == "" :  form.time_pattern.data = None

        # add file 
        fileName = secure_filename(form.dataset.data.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], fileName)
        form.dataset.data.save(file_path)

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
    def get(self, id):
        """
        GET 
        a Single dataset per ID

        """

        datasets = Dataset.query.filter_by(id=id).first()
        if datasets is None :
            return 404
        dataset= DatasetSerializer(datasets).data

        if dataset["index_state"] == "done" :
            es_info= get_index_info(dataset["index_name"])
            dataset["records_count"] = es_info["indices"][dataset["index_name"]]["docs"]["num_docs"]

        return dataset

class DatasetSampleView(restful.Resource):
    @login_required
    def get(self, id):
        """
        GET 
        return a sample of 10 lines from a dataset 

        args : ID
        returns : a dict

        """
        dataset = Dataset.query.filter_by(id=id).first()

        try:
            csv_sample = get_csv_sample(dataset.filepath)
            return csv_sample, 201
        except UnicodeDecodeError:
            return []

def get_csv_sample(path):
    csv_file = csv.DictReader(open(path))

    csv_sample=[]
    fieldnames=csv_file.next() # get name

    for i,row in enumerate(csv_file):
        if i == 10 : break
        csv_sample.append(row)

    return csv_sample

class DatasetEsView(restful.Resource) :
    @login_required
    def get(self, id):
        """" Manage job queue to index  data into elasticsearch"""
        
        d = Dataset.query.filter_by(id=id).first()
        dataset = DatasetSerializer(d).data
        
        index_state = dataset["index_state"]
        print index_state

        if index_state == "raw" :
        #     # build_topo_index(dataset["filepath"], dataset["topotype_id"], dataset["index_name"])
            # jobs.queue()
            # d.index_state = "processing"
            # db.session.commit()
            return "job started", 200

        elif index_state == "processing" :
        #     # do nothing
        #     es_info= get_index_info(dataset["index_name"])
            return "job ongoing", 201

        elif index_state == "done" :
        #     es_info= get_index_info(dataset["index_name"])
            return "job done", 201

        return 201
        # return {
            # "index_name" : dataset["index_name"],
            # "count" : es_info["indices"][dataset["index_name"]]["docs"]["num_docs"]
            # "info" : es_info["indices"][dataset["index_name"]]
            # "info" : es_info[""]
            # }

# class DatasetEsStart(restful.Resource):
#     @login_required
#     def get(self, id):
#         datasets = Dataset.query.filter_by(id=id).first()
#         dataset= DatasetSerializer(datasets).data
#         # build_topo_index(file_path, form.topotype_id.data, es_index_name)
#         return {"status" : "started"}

