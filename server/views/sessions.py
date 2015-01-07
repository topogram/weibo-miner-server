#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask import session
from flask_login import login_required, logout_user, current_user, login_user
from flask.ext.principal import Principal, Identity, AnonymousIdentity, identity_changed, identity_loaded, RoleNeed, UserNeed

from server import app, restful, bcrypt, db
from server.models.user import User
from server.forms.session import SessionCreateForm
from server.serializers.user import UserSerializer

class SessionView(restful.Resource):
    def post(self):
        """ Create session using Flask-Login and Flask-Principal for roles"""

        form = SessionCreateForm()
        if not form.validate_on_submit():
            return {"status" : "error", "message" : forms.errors }, 422

        user = User.query.filter_by(email=form.email.data).first()
        if user is None:
            return {"status" : "error", "message" : "User does not exist."}, 401

        if not  bcrypt.check_password_hash(user.password, form.password.data):
            return {"status" : "error", "message" : "Invalid password."}, 401

        # User is auth with flask-login
        login_user(user, remember=True)

         # Tell Flask-Principal the identity changed
        identity_changed.send(app, identity=Identity(user.id))
        return 'You were logged in.', 201

    def delete(self):
        """
        Destroy user session.
        1) Remove the user information from the session.
        2) Remove session keys set by Flask-Principal
        3) Tell Flask-Principal the user is anonymous
        """

        logout_user() 

        for key in ('identity.name', 'identity.auth_type'):
            session.pop(key, None)

        identity_changed.send(app,identity=AnonymousIdentity())

        return 'You were logged out.', 201
