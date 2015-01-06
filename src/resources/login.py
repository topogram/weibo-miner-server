#!/usr/bin/env python
# -*- coding: utf-8 -*-

from src.resources import app
from datetime import timedelta

from flask.ext.login import (LoginManager, login_required, login_user, current_user, logout_user, UserMixin)
from flask.ext.principal import Principal

from flask.ext.bcrypt import Bcrypt

# flask-bcrypt
flask_bcrypt = Bcrypt(app)

#Flask-Login Login Manager
login_manager = LoginManager()
app.config["REMEMBER_COOKIE_DURATION"] = timedelta(days=14)
login_manager.init_app(app)

# User Rights
principals = Principal(app)
