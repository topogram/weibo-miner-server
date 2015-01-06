#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask_login import login_required, logout_user, current_user, login_user
from flask.ext.principal import Principal, Identity, AnonymousIdentity, identity_changed, identity_loaded, RoleNeed, UserNeed

from src.resources import app, db, restful, flask_bcrypt
from src.forms.session import SessionCreateForm
from src.models.user import User

class SessionView(restful.Resource):
    def post(self):
        # print "create session"
        form = SessionCreateForm()
        if not form.validate_on_submit():
            return form.errors, 422

        user = User.query.filter_by(email=form.email.data).first()
        
        if user and flask_bcrypt.check_password_hash(user.password, form.password.data):
            
            # User is auth with falsk-login
            login_user(user, remember=True)

             # Tell Flask-Principal the identity changed
            identity_changed.send(app, identity=Identity(user.id))

            return UserSerializer(user).data, 201
        return '', 401

    def delete(self):
        # print"destroying session"

        # Remove the user information from the session
        logout_user() 

        # Remove session keys set by Flask-Principal
        for key in ('identity.name', 'identity.auth_type'):
            session.pop(key, None)

        # Tell Flask-Principal the user is anonymous
        identity_changed.send(app,identity=AnonymousIdentity())

        return 'session destroyed', 201
