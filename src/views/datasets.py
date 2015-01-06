#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask import request
from flask_login import login_required

from src.resources import app, db, restful
from src.models.dataset import Dataset 
from src.forms.dataset import DatasetCreateForm
from src.serializers.dataset import DatasetSerializer
from src.lib.queue import RedisQueue
from src.lib.elastic import get_index_info

class DatasetListView(restful.Resource):

    @login_required
    def get(self):
        # print current_user
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

        # index to elasticsearch
        safename = "".join([c for c in fileName if c.isalpha() or c.isdigit() or c==' ']).rstrip()
        es_index_name=(safename + "_"+ str(uuid.uuid4())).lower()

        # build_topo_index(file_path, form.topotype_id.data, es_index_name)

        # index file
        dataset = Dataset(form.title.data, form.topotype_id.data, form.description.data, es_index_name, str(file_path))

        db.session.add(dataset)
        db.session.commit()
        
        return DatasetSerializer(dataset).data, 201

class DatasetView(restful.Resource):

    @login_required
    def get(self, id):
        """
        GET 
        a Single dataset per ID

        params:
            to_index (true) : if to_index=true, the whole dataset will be indexed
            sample (true) : if sample=true, a sample of the dataset will be returned
        """

        datasets = Dataset.query.filter_by(id=id).first()
        if datasets is None :
            return 404
        dataset= DatasetSerializer(datasets).data

        # reset tasks queue
        q = RedisQueue('topogram:'+ dataset["index_name"])
        q.clean()


        if request.values.get('to_index') == "true" :
            print 'build topo index'
            build_topo_index(dataset["filepath"], dataset["topotype_id"], dataset["index_name"])

        if request.values.get('sample') == "true" :
            # get csv sample
            csv_file = csv.reader(open(dataset["filepath"]))
            csv_sample=[]
            fieldnames=csv_file.next() # get name

            for line in range(0,10):
                row={}
                for i,rec in enumerate(csv_file.next()):
                    row[fieldnames[i]] = rec
                csv_sample.append(row)
            dataset["csvSample"] = csv_sample

        es_info= get_index_info(dataset["index_name"])
        dataset["records_count"] = es_info["indices"][dataset["index_name"]]["docs"]["num_docs"]

        return dataset

    @login_required
    def delete(self, id):
        dataset = Dataset.query.filter_by(id=id).first()
        
        d= DatasetSerializer(dataset).data
        delete_index(d["index_name"])

        db.session.delete(dataset)
        db.session.commit()
        return '{"ok" : dataset deleted"}', 204

class DatasetEsView(restful.Resource) :
    @login_required
    def get(self, id):
        datasets = Dataset.query.filter_by(id=id).first()
        dataset= DatasetSerializer(datasets).data

        es_info= get_index_info(dataset["index_name"])

        return {
            "index_name" : dataset["index_name"],
            "count" : es_info["indices"][dataset["index_name"]]["docs"]["num_docs"]
            # "info" : es_info["indices"][dataset["index_name"]]
            # "info" : es_info[""]
            }

class DatasetEsStart(restful.Resource):
    @login_required
    def get(self, id):
        datasets = Dataset.query.filter_by(id=id).first()
        dataset= DatasetSerializer(datasets).data
        # build_topo_index(dataset["filepath"], dataset["topotype_id"], dataset["index_name"])
        return {"status" : "started"}

