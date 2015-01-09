#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask_login import login_required

from server import app, restful, db
from server.models.topogram import Topogram 
from server.models.regexp import Regexp

from server.forms.topogram import TopogramCreateForm
from server.serializers.topogram import TopogramSerializer

from server.lib.indexer import get_topogram

class TopogramListView(restful.Resource):
    @login_required
    def get(self):
        topograms = Topogram.query.all()
        return TopogramSerializer(topograms, many=True).data

    @login_required
    def post(self):
        form = TopogramCreateForm()

        if not form.validate_on_submit():
            return form.errors, 422

        reg = Regexp.query.filter_by(id=form.citation_patterns.data).first()
        if reg is None : return "Citations patterns doesn't exist", 404


        print form.citation_patterns.data
        print reg

        topogram = Topogram(form.dataset_id.data,form.description.data, str(form.es_index_name.data), form.es_query.data,  form.records_count.data, form.words_limit.data, form.citations_limit.data,form.words.data, form.citations.data, form.stopwords.data, reg)

        db.session.add(topogram)
        db.session.commit()

        # add regexp backref
        topogram.citations_patterns.append(reg)
        db.session.commit()

        return TopogramSerializer(topogram).data

class TopogramView(restful.Resource):

    @login_required
    def get(self, dataset_id, topogram_id):

        t = Topogram.query.filter_by(id=topogram_id).first()
        topogram= TopogramSerializer(t).data

        for key in topogram : print key, topogram[key]
        if topogram["citations_patterns"] is None : return "missing citation pattern", 422

        if topogram["status"] == "raw":
            # process data
            get_topogram(topogram)
            return { "status": "started"}, 201

        elif topogram["status"] == "processing" :
            return { "status": "processing"}, 201

        elif topogram["status"] == "done" :
            return { "status": "done"}, 201

        return topogram

    @login_required
    def delete(self, dataset_id, topogram_id):
        topogram = topogram.query.filter_by(id=topogram_id).first()
        db.session.delete(topogram)
        db.session.commit()
        return '{"ok" : post deleted"}', 204

class TopogramsByDataset(restful.Resource):

    def get(self, id):
        print id, type(id)
        topograms = Topogram.query.filter_by(dataset_id=id).all()
        topograms = TopogramSerializer(topograms, many=True).data
        return topograms

class TopogramNetworksView(restful.Resource):
    @login_required
    def post(self):

        form = TopogramCreateForm()
        if not form.validate_on_submit():
            return form.errors, 422

        # TODO : fix nasty fallback
        # print(form.words_limit, form.citations_limit) 
        if form.words_limit is None : 
            words_limit=100 
        else :
            words_limit=form.words_limit.data

        if form.citations_limit is None : 
            citations_limit=100
        else :
            citations_limit=form.citations_limit.data

        # topo =get_topo_networks_from_es(form.es_query.data, form.topotype_id.data, str(form.es_index_name.data), words_limit, citations_limit)

        return topo

class TopogramTimeFramesList(restful.Resource):
    
    def get(self, dataset_id, Topogram_id):
        topogram = Topogram.query.filter_by(id=topogram_id).first()
        topogram= TopogramSerializer(topogram).data
        topogram_data=mongo.db.topograms.find_one({ "_id" : ObjectId(topogram["data_mongo_id"]) })
        # print Topogram_data["timeframes"]
        rep=[ {"count":0, "timestamp":d["time"]} for d in topogram_data["timeframes"]]

        return sorted(rep, key=lambda k: k['timestamp'])

class TopogramTimeFramesView(restful.Resource):
    def get(self, dataset_id, Topogram_id, start, end):
        print  start, end
        topogram = Topogram.query.filter_by(id=Topogram_id).first()
        topogram= TopogramSerializer(topogram).data
        topogram_data=mongo.db.topograms.find_one({ "_id" : ObjectId(topogram["data_mongo_id"]) })

        return timeframes_to_networks(Topogram_data)
