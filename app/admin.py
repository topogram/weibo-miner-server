from server import app, db, flask_bcrypt

from flask import redirect, url_for, request

from flask.ext.admin.contrib.sqla import ModelView
from flask.ext.admin import Admin, AdminIndexView, helpers, expose
from flask.ext.admin.contrib.fileadmin import FileAdmin

from flask.ext.login import login_user, current_user, logout_user

from flask.ext.principal import Permission, Need
from functools import partial

from forms import SessionCreateForm
from models import User, Dataset, Topogram, Topotype, Regexp
from views import admin_permission
import os.path as op

# admin_role
AdminAccessNeed = partial(Need, 'admin')

class AdminAccessPermission(Permission):
    def __init__(self, user_id):
        need = AdminAccessNeed(user_id)
        super(AdminAccessPermission, self).__init__(need)

# Create customized index view class that handles login & registration
class MyAdminIndexView(AdminIndexView):

    def is_accessible(self):
        if current_user.is_anonymous():
            # return redirect(url_for('.index'))
            return False
        return current_user.is_authenticated()

    @expose('/')
    def index(self):
        if not current_user.is_authenticated():
            return redirect(url_for('.login_view'))
        return super(MyAdminIndexView, self).index()

    @expose('/login/', methods=('GET', 'POST'))
    def login_view(self):
        form = SessionCreateForm(request.form)
        if helpers.validate_form_on_submit(form):
            user = User.query.filter_by(email=form.email.data).first()
            if user and flask_bcrypt.check_password_hash(user.password, form.password.data):
                # User is auth with falsk-login
                login_user(user, remember=True)

        if current_user.is_authenticated():
            return redirect(url_for('.index'))
        link = '<p>Don\'t have an account? <a href="' + url_for('.register_view') + '">Click here to register.</a></p>'
        self._template_args['form'] = form
        self._template_args['link'] = link

        return super(MyAdminIndexView, self).index()

    @expose('/register/', methods=('GET', 'POST'))
    def register_view(self):
        form = RegistrationForm(request.form)
        if helpers.validate_form_on_submit(form):
            user = User()

            form.populate_obj(user)
            # we hash the users password to avoid saving it as plaintext in the db,
            # remove to use plain text:
            user.password = generate_password_hash(form.password.data)

            db.session.add(user)
            db.session.commit()

            login_user(user)
            return redirect(url_for('.index'))
        link = '<p>Already have an account? <a href="' + url_for('.login_view') + '">Click here to log in.</a></p>'
        self._template_args['form'] = form
        self._template_args['link'] = link
        return super(MyAdminIndexView, self).index()

    @expose('/logout/')
    def logout_view(self):
        logout_user()
        return redirect(url_for('.index'))

admin = Admin(app, index_view=MyAdminIndexView())

class TopotypeView(ModelView):
    column_auto_select_related = True
    # column_display_all_relations = True

# Add administrative views here
admin.add_view(ModelView(User, db.session))
admin.add_view(ModelView(Dataset, db.session))
admin.add_view(ModelView(Topogram, db.session))
admin.add_view(TopotypeView(Topotype, db.session))
admin.add_view(ModelView(Regexp, db.session))

path = op.join(op.dirname(__file__), 'static')
admin.add_view(FileAdmin(path, '/static/', name='Static Files'))
