#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask_wtf.file import FileField, FileAllowed, FileRequired
from flask.ext.uploads import UploadSet, DATA

from wtforms import StringField
from wtforms.validators import DataRequired

from src.forms.model import ModelForm
from src.models.dataset import Dataset

datasets = UploadSet('data', DATA)

class DatasetCreateForm(ModelForm):
    class Meta:
        model = Dataset
    dataset = FileField("dataset", validators=[DataRequired()])
    topotype_id=StringField('topotype_id', validators=[DataRequired()])
