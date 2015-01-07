#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask import session, request, g

from itsdangerous import URLSafeTimedSerializer
from flask.ext.principal import Permission, RoleNeed
from flask.ext.principal import Principal, Identity, AnonymousIdentity, identity_changed, identity_loaded, RoleNeed, UserNeed

from flask_login import login_required, logout_user, current_user, login_user

from server import app, restful, login_manager, db
from server.models.user import User
from server.forms.user import UserCreateForm
from server.serializers.user import UserSerializer

import logging
logger = logging.getLogger('topogram-server.views.user')

# roles
admin_role = RoleNeed('admin')
user_role  = RoleNeed('user')

# permissions
admin_permission = Permission(admin_role)
user_permission = Permission(user_role)

class UserView(restful.Resource):
    """ View to create or delete single user"""

    def post(self):
        form = UserCreateForm()

        if not form.validate_on_submit():
            return {"status" : "error", "message" : form.errors}, 422

        if form.invite.data != "invite":
            return {"status" : "error", "message" : "Wrong invitation code."}, 410

        # check if user already exists before trying to create
        user = User.query.filter_by(email=form.email.data).first()
        if user is not None:
            return {"status" : "error", "message" : "User already exists."}, 401

        # create user
        user = User(form.email.data, form.password.data)
        db.session.add(user)
        db.session.commit()

        # log user
        login_user(user, remember=True)

        return UserSerializer(user).data, 201

    @login_required
    @admin_permission.require(http_exception=403)
    def get(self):
        try:
            users = User.query.all()
            return UserSerializer(users, many=True).data
        except Exception as e:
            print e
            return '', 500

# flask login api call back methods
login_serializer = URLSafeTimedSerializer(app.secret_key)

@identity_loaded.connect_via(app)
def on_identity_loaded(sender, identity):
    # Set the identity user object
    identity.user = current_user

    # Add the UserNeed to the identity
    if hasattr(current_user, 'id'):
        identity.provides.add(UserNeed(current_user.id))

    # Assuming the User model has a list of roles, update the
    # identity with the roles that the user provides
    if hasattr(current_user, 'role'):
        identity.provides.add(RoleNeed(current_user.role))

    if hasattr(current_user, 'roles'):
        for role in current_user.roles:
            identity.provides.add(RoleNeed(role.name))

@app.before_request
def before_request():
    """ Assign curent to falsk global context """ 
    logger.info("logged in as %s"%current_user)
    g.user = current_user

@login_manager.user_loader
def load_user(userid):
    return User.query.filter(User.id == userid).first()

@login_manager.token_loader
def load_token(token):
    max_age = app.config["REMEMBER_COOKIE_DURATION"].total_seconds()
    print max_age
    
    #Decrypt the Security Token, data = [username, hashpass]
    data = login_serializer.loads(token, max_age=max_age)
    
    #Find the User
    user = User.query.filter(User.id == data[0]).first()
    
    print 'calling load_token()-->', data
    print 'query user and got->', user
    
    if user and data[1] == user.password:
        return user
    return None
