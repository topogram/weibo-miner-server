#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask.ext.wtf import Form
from wtforms.validators import DataRequired
from wtforms import StringField, PasswordField

class SessionCreateForm(Form):
    email = StringField('email', validators=[DataRequired()])
    password = PasswordField('password', validators=[DataRequired()])
