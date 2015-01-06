#!/usr/bin/env python
# -*- coding: utf-8 -*-

from wtforms import StringField
from wtforms.validators import DataRequired

from src.forms import ModelForm
from src.models.user import User

class UserCreateForm(ModelForm):
    class Meta:
        model = User
    invite=StringField('invite', validators=[DataRequired()])
