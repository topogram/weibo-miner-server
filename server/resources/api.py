#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask.ext.restful import reqparse, Api
from flask_restful_swagger import swagger

from server import app 
from server.views.users import UserView
from server.views.sessions import SessionView
from server.views.regexps import RegexpListView, RegexpView
from server.views.datasets import DatasetListView, DatasetView, DatasetEsView, DatasetSampleView
from server.views.topograms import TopogramListView, TopogramNetworksView, TopogramsByDataset, TopogramView, TopogramTimeFramesList, TopogramTimeFramesView

# doc for flask restful with swagger
api = swagger.docs(Api(app), apiVersion='0.1', api_spec_url="/api/v1/spec", resourcePath="/api/v1/spec")

# users
api.add_resource(UserView, '/api/v1/users')
api.add_resource(SessionView, '/api/v1/sessions')

# datasets
api.add_resource(DatasetListView, '/api/v1/datasets')
api.add_resource(DatasetView, '/api/v1/datasets/<int:id>')
api.add_resource(DatasetEsView, '/api/v1/datasets/<int:id>/index')
api.add_resource(DatasetSampleView, '/api/v1/datasets/<int:id>/sample')

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
