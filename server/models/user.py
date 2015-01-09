#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask import g
from server import bcrypt, secret_key, db

from wtforms.validators import Email
from itsdangerous import URLSafeTimedSerializer
from flask.ext.login import UserMixin

class AnonymousUser:
    #############################################################
    # method required by flask-login
    #############################################################
    
    def is_authenticated(self):
        return False
    
    def is_anonymous(self):
        return True
    
    def is_active(self):
        return False
    
    def get_id(self):
        return None

class User(db.Model, UserMixin):
    """
    User model
    requires an email and a password

    """
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, info={'validators': Email()})
    password = db.Column(db.String(80), nullable=False)
    role = db.Column(db.String(120))
    datasets = db.relationship('Dataset', backref='user', lazy='dynamic')
    topograms = db.relationship('Topogram', backref='user', lazy='dynamic')
    active = db.Column(db.Boolean, unique=False, default=True)
    registered_on = db.Column(db.DateTime, default=db.func.now())
 
    def __init__(self, email=None, password=None, is_active=True):
        self.email = email
        self.password = bcrypt.generate_password_hash(password)
        self.active = is_active
        self.role = "user"
 
    def __repr__(self):
        return "<User('%d', '%s', '%s')>" % (self.id, self.email, self.role)

    def get_auth_token(self):
        """
        Encode a secure token for cookie
        """
        login_serializer = URLSafeTimedSerializer(secret_key)
        data = [str(self.id), self.password]
        return login_serializer.dumps(data)

    # methods required by flask-login

    def is_authenticated(self):
        return True

    def is_anonymous(self):
        return False
    
    def is_active(self):
        return self.active
    
    def get_id(self):
        return unicode(self.id)
