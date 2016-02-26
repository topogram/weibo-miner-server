#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask.ext.wtf import Form
from wtforms import StringField, PasswordField, TextField
from wtforms.validators import DataRequired, Email, ValidationError
from server.forms.model import ModelForm
from server.models.user import User

class UserCreateForm(ModelForm):
    class Meta:
        model = User
    invite=StringField('invite', validators=[DataRequired()])

class ExistingUser(object):
    def __init__(self, message="Email doesn't exists"):
        self.message = message

    def __call__(self, form, field):
        if not User.query.filter_by(email=field.data).first():
            raise ValidationError(self.message)

reset_rules = [DataRequired(),
          Email(),
          ExistingUser(message='Email address does not exist')
         ]

class NewPasswordForm(Form):
    email = TextField('Email', validators=reset_rules)

class ResetPasswordSubmitForm(Form):
    email = TextField('Email', validators=reset_rules)
    password = PasswordField('Password', validators=[ DataRequired() ] )
    confirm = PasswordField('Confirm Password', validators=[ DataRequired() ])
    token = PasswordField('Token', validators=[DataRequired()] )
