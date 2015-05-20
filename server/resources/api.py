#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask.ext.restful import reqparse, Api
from flask_restful_swagger import swagger

from server import app 
from server.views.users import UserView
from server.views.sessions import SessionView
from server.views.regexps import RegexpListView, RegexpView
from server.views.datasets import DatasetListView, DatasetView, DatasetSampleView, DatasetProcessView,DatasetSizeView, DatasetPaginateView
from server.views.topograms import TopogramListView, TopogramWordsView, TopogramCitationsView, TopogramsByDataset, TopogramView, TopogramTimeFramesView,TopogramFrequentWordsView, TopogramTimeSeries

# doc for flask restful with swagger
api = swagger.docs(Api(app), apiVersion='0.1', api_spec_url="/api/v1/spec", resourcePath="/api/v1/spec")

# users
api.add_resource(UserView, '/api/v1/users')
api.add_resource(SessionView, '/api/v1/sessions')

# datasets
api.add_resource(DatasetListView, '/api/v1/datasets')
api.add_resource(DatasetView, '/api/v1/datasets/<int:id>')
api.add_resource(DatasetProcessView, '/api/v1/datasets/<int:id>/index')
api.add_resource(DatasetSampleView, '/api/v1/datasets/<int:id>/sample')
api.add_resource(DatasetSizeView, '/api/v1/datasets/<int:id>/size')
api.add_resource(DatasetPaginateView, '/api/v1/datasets/<int:id>/from/<int:start>/qty/<int:qty>')


# topograms
api.add_resource(TopogramListView, '/api/v1/topograms')
api.add_resource(TopogramsByDataset, '/api/v1/datasets/<int:id>/topograms')
api.add_resource(TopogramView, '/api/v1/datasets/<int:dataset_id>/topograms/<int:topogram_id>')

# data operations
api.add_resource(TopogramWordsView, '/api/v1/datasets/<int:dataset_id>/words/<int:words_limit>')
api.add_resource(TopogramFrequentWordsView, '/api/v1/datasets/<int:dataset_id>/frequentWords/<int:words_limit>')
api.add_resource(TopogramTimeSeries, '/api/v1/datasets/<int:dataset_id>/timeSeries')

# api.add_resource(TopogramCitationsView, '/api/v1/topograms/<int:topogram_id>/citations/<int:citations_limit>')
# api.add_resource(TopogramTimeFramesView, '/api/v1/datasets/<int:dataset_id>/topograms/<int:topogram_id>/timeframes/<int:start>/<int:end>')

# regexps
api.add_resource(RegexpListView, '/api/v1/regexps')
api.add_resource(RegexpView, '/api/v1/regexps/<int:id>')
