#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask_login import login_required
from src.resources import app, restful
from src.resources.db import db
from src.models.regexp import Regexp
from src.forms.regexp import RegexpCreateForm
from src.serializers.regexp import RegexpSerializer

class RegexpListView(restful.Resource):
    def post(self):
        form = RegexpCreateForm()

        if not form.validate_on_submit():
            return form.errors, 422

        regexp = Regexp(title=form.title.data, regexp=form.regexp.data)
        db.session.add(regexp)
        db.session.commit()
        return RegexpSerializer(regexp).data

    def get(self):
        try:
            regexps = Regexp.query.all()
            return RegexpSerializer(regexps, many=True).data
            
        except Exception as e:
            print e
            return '', 500

class RegexpView(restful.Resource):
    def get(self, id):
        print id, type(id)
        regexp = Regexp.query.filter_by(id=id).first()
        regexp= RegexpSerializer(regexp).data
        return regexp
