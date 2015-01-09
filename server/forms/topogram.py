#!/usr/bin/env python
# -*- coding: utf-8 -*-

from wtforms import StringField
from wtforms.validators import DataRequired

from server.forms.model import ModelForm
from server.models.topogram import Topogram

class TopogramCreateForm(ModelForm):
    class Meta:
        model = Topogram
    dataset_id=StringField('dataset_id', validators=[DataRequired()])
    citation_patterns=StringField('citation_patterns', validators=[DataRequired()])
