#!/usr/bin/env python
# -*- coding: utf-8 -*-

from wtforms import StringField
from wtforms.validators import DataRequired

from server.forms.model import ModelForm
from server.models.user import User

class UserCreateForm(ModelForm):
    class Meta:
        model = User
    invite=StringField('invite', validators=[DataRequired()])
