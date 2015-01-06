#!/usr/bin/env python
# -*- coding: utf-8 -*-

from wtforms import StringField
from wtforms.validators import DataRequired

from src.forms.model import ModelForm
from src.models.topogram import Topogram

class TopogramCreateForm(ModelForm):
    class Meta:
        model = Topogram
    dataset_id=StringField('dataset_id', validators=[DataRequired()])
    topotype_id=StringField('topotype_id', validators=[DataRequired()])
