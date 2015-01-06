#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask.ext.restful import reqparse, Api
from flask_restful_swagger import swagger

from src.resources import app 
from src.views.users import UserView
from src.views.sessions import SessionView
from src.views.regexps import RegexpListView, RegexpView
from src.views.topotypes import TopotypeView, TopotypeListView
from src.views.datasets import DatasetListView, DatasetView, DatasetEsView, DatasetEsStart
from src.views.topograms import TopogramListView, TopogramNetworksView, TopogramsByDataset, TopogramView, TopogramTimeFramesList, TopogramTimeFramesView

# doc for flask restful with swagger
api = swagger.docs(Api(app), apiVersion='0.1', api_spec_url="/api/v1/spec", resourcePath="/api/v1/spec")

# users
api.add_resource(UserView, '/api/v1/users')
api.add_resource(SessionView, '/api/v1/sessions')

# datasets
api.add_resource(DatasetListView, '/api/v1/datasets')
api.add_resource(DatasetView, '/api/v1/datasets/<int:id>')
api.add_resource(DatasetEsView, '/api/v1/datasets/<int:id>/index')
api.add_resource(DatasetEsStart, '/api/v1/datasets/<int:id>/index/start')

# topograms
api.add_resource(TopogramListView, '/api/v1/topograms')
api.add_resource(TopogramNetworksView, '/api/v1/topograms/networks')
api.add_resource(TopogramsByDataset, '/api/v1/datasets/<int:id>/topograms')
api.add_resource(TopogramView, '/api/v1/datasets/<int:dataset_id>/topograms/<int:topogram_id>')
api.add_resource(TopogramTimeFramesList, '/api/v1/datasets/<int:dataset_id>/topograms/<int:topogram_id>/timeframes')

api.add_resource(TopogramTimeFramesView, '/api/v1/datasets/<int:dataset_id>/topograms/<int:topogram_id>/timeframes/<int:start>/<int:end>')

# regexps
api.add_resource(RegexpListView, '/api/v1/regexps')
api.add_resource(RegexpView, '/api/v1/regexps/<int:id>')

# topotypes
api.add_resource(TopotypeView, '/api/v1/topotypes/<int:id>')
api.add_resource(TopotypeListView, '/api/v1/topotypes')
