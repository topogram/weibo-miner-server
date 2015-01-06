#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask_login import login_required

from src.resources import app, db, restful
from src.models.regexp import Regexp
from src.serializers.topotype import TopotypeSerializer

class TopotypeListView(restful.Resource):
    def get(self):
        try:
            topotypes = Topotype.query.all()
            print topotypes
            return TopotypeSerializer(topotypes, many=True).data
            
        except Exception as e:
            print e
            return '', 500

class TopotypeView(restful.Resource):
    def get(self, id):
        topotype = Topotype.query.filter_by(id=id).first()
        topotype= TopotypeSerializer(topotype).data
        return topotype
