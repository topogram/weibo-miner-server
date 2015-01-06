#!/usr/bin/env python
# -*- coding: utf-8 -*-

from flask import session, request, g

import sendgrid
from itsdangerous import URLSafeTimedSerializer
from flask.ext.principal import Permission, RoleNeed
from flask.ext.principal import Principal, Identity, AnonymousIdentity, identity_changed, identity_loaded, RoleNeed, UserNeed

from flask_login import login_required, logout_user, current_user, login_user

from src.resources import app, db, restful
from src.resources.login import login_manager
from src.models.user import User
from src.forms.user import UserCreateForm
from src.serializers.user import UserSerializer


# roles
admin_role = RoleNeed('admin')
user_role  = RoleNeed('user')

# permissions
admin_permission = Permission(admin_role)
user_permission = Permission(user_role)

mailer = sendgrid.SendGridClient(app.config['SENDGRID_USERNAME'],
                           app.config['SENDGRID_PASSWORD'],
                           secure=True)

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
    print current_user
    g.user = current_user

class UserView(restful.Resource):
    def post(self):
        form = UserCreateForm()

        if not form.validate_on_submit():
            return form.errors, 422

        if form.invite.data != "invite":
            return form.errors, 410

        user = User(form.email.data, form.password.data)
        db.session.add(user)
        db.session.commit()
        return UserSerializer(user).data

    @login_required
    @admin_permission.require(http_exception=403)
    def get(self):
        try:
            users = User.query.all()
            return UserSerializer(users, many=True).data
            
        except Exception as e:
            print e
            return '', 500

def send_welcome_email(to, name):
    subject = "Welcome to Topogram.io"
    txt_template = jinja_env.get_template('emails/confirm.txt')
    html_template = jinja_env.get_template('emails/confirm.html')
    text = txt_template.render(name=name)
    html = html_template.render(name=name)
    message = sendgrid.Message(('hi@topogram.io', 'Topogram Invites'),
                               subject, text, html)

    message.add_to(to)
    mailer.web.send(message)


# flask login api call back methods
login_serializer = URLSafeTimedSerializer(app.secret_key)

@login_manager.user_loader
def load_user(userid):
    return User.query.filter(User.id == userid).first()

@login_manager.token_loader
def load_token(token):
    max_age = app.config["REMEMBER_COOKIE_DURATION"].total_seconds()
    #Decrypt the Security Token, data = [username, hashpass]
    data = login_serializer.loads(token, max_age=max_age)
    #Find the User
    user = User.query.filter(User.id == data[0]).first()
    
    print 'calling load_token()-->', data
    print 'query user and got->', user
    
    if user and data[1] == user.password:
        return user
    return None
