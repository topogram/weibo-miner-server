import os 
import csv

from flask import g
from flask.ext import restful
from flask_restful_swagger import swagger
from werkzeug import secure_filename

from lib.elastic import *
import uuid

from server import app, api, db, flask_bcrypt, auth
from models import User, Dataset
from forms import UserCreateForm, SessionCreateForm, DatasetCreateForm
from serializers import UserSerializer, DatasetSerializer
import sendgrid

mailer = sendgrid.SendGridClient(app.config['SENDGRID_USERNAME'],
                           app.config['SENDGRID_PASSWORD'],
                           secure=True)

@auth.verify_password
def verify_password(email, password):
    user = User.query.filter_by(email=email).first()
    if not user:
        return False
    g.user = user
    return flask_bcrypt.check_password_hash(user.password, password)
 
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

class SessionView(restful.Resource):
    def post(self):
        form = SessionCreateForm()
        if not form.validate_on_submit():
            return form.errors, 422
 
        user = User.query.filter_by(email=form.email.data).first()
        if user and flask_bcrypt.check_password_hash(user.password, form.password.data):
            return UserSerializer(user).data, 201
        return '', 401
 
class DatasetListView(restful.Resource):
    def get(self):
        datasets = Dataset.query.all()
        return DatasetSerializer(datasets, many=True).data
 
    @auth.login_required
    def post(self):

        form = DatasetCreateForm()
        if not form.validate_on_submit():
            return form.errors, 422

        # add file 
        fileName = secure_filename(form.dataset.data.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], fileName)
        form.dataset.data.save(file_path)

        # index to elasticsearch
        print fileName
        es_index_name=fileName[0:-4] + "_"+ str(uuid.uuid4())
        build_es_index_from_csv(file_path,es_index_name)

        # index file
        dataset = Dataset(form.title.data, form.type.data, form.description.data,str(file_path))

        db.session.add(dataset)
        db.session.commit()
        
        return DatasetSerializer(dataset).data, 201

class DatasetView(restful.Resource):
    def get(self, id):
        datasets = Dataset.query.filter_by(id=id).first()
        desc= DatasetSerializer(datasets).data
        
        # get csv sample
        csv_file = csv.reader(open(desc["filepath"]))
        csv_sample=[]
        fieldnames=csv_file.next() # get name

        for line in range(0,10):
            row={}
            for i,rec in enumerate(csv_file.next()):
                row[fieldnames[i]] = rec
            csv_sample.append(row)
        desc["csvSample"] = csv_sample
        return desc

    def delete(self, id):
        dataset = Dataset.query.filter_by(id=id).first()
        db.session.delete(dataset)
        db.session.commit()
        return '{"ok" : post deleted"}', 204


api.add_resource(UserView, '/api/v1/users')
api.add_resource(SessionView, '/api/v1/sessions')
api.add_resource(DatasetListView, '/api/v1/datasets')
api.add_resource(DatasetView, '/api/v1/datasets/<int:id>')
