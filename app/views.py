import os 
import csv

from flask import g
from flask.ext import restful
from flask_restful_swagger import swagger
from werkzeug import secure_filename

from datetime import datetime

from lib.elastic import *
import uuid
from bson import ObjectId

from flask_login import login_required, logout_user, current_user, login_user

from server import app, api, db, flask_bcrypt, mongo, login_manager
from models import User, Dataset, Meme
from forms import UserCreateForm, SessionCreateForm, DatasetCreateForm, MemeCreateForm
from serializers import UserSerializer, DatasetSerializer, MemeSerializer
from itsdangerous import URLSafeTimedSerializer
import sendgrid

mailer = sendgrid.SendGridClient(app.config['SENDGRID_USERNAME'],
                           app.config['SENDGRID_PASSWORD'],
                           secure=True)

# @auth.verify_password
# def verify_password(email, password):
#     user = User.query.filter_by(email=email).first()
#     if not user:
#         return False
#     g.user = user
#     return flask_bcrypt.check_password_hash(user.password, password)

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

    def get(self):
        # print "calling /api/users/get"
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

class SessionView(restful.Resource):
    def post(self):
        # print "create session"
        form = SessionCreateForm()
        if not form.validate_on_submit():
            return form.errors, 422

        user = User.query.filter_by(email=form.email.data).first()
        # print user
        if user and flask_bcrypt.check_password_hash(user.password, form.password.data):
            # auth !
            login_user(user, remember=True)
            return UserSerializer(user).data, 201
        return '', 401

    def delete(self):
        print"destroying session"
        logout_user()
        return 'session destroyed', 201

############################################################
# flask login api call back methods
############################################################
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

class DatasetListView(restful.Resource):

    @login_required
    def get(self):
        # print current_user
        datasets = Dataset.query.all()
        return DatasetSerializer(datasets, many=True).data
 
    @login_required
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
        dataset = Dataset(form.title.data, form.type.data, form.description.data, es_index_name, str(file_path))

        db.session.add(dataset)
        db.session.commit()
        
        return DatasetSerializer(dataset).data, 201

class DatasetView(restful.Resource):

    @login_required
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

    @login_required
    def delete(self, id):
        dataset = Dataset.query.filter_by(id=id).first()
        db.session.delete(dataset)
        db.session.commit()
        return '{"ok" : post deleted"}', 204

class MemeListView(restful.Resource):
    @login_required
    def get(self):
        memes = Meme.query.all()
        return MemeSerializer(memes, many=True).data

    @login_required
    def post(self):
        form = MemeCreateForm()

        if not form.validate_on_submit():
            return form.errors, 422

        data_mongo_id=mongo.db.memes.insert({
                    "es_query" : form.es_query.data,
                    "es_index" : str(form.es_index_name.data),
                    "messages" :[]})

        records_count = es2topogram(form.es_query.data, str(form.es_index_name.data),  data_mongo_id)

        meme = Meme(form.dataset_id.data,form.description.data, str(form.es_index_name.data), form.es_query.data, str(data_mongo_id), records_count)

        db.session.add(meme)
        db.session.commit()
        return MemeSerializer(meme).data

class MemeView(restful.Resource):

    @login_required
    def get(self, dataset_id, meme_id):
        meme = Meme.query.filter_by(id=meme_id).first()
        meme= MemeSerializer(meme).data
        return meme

    @login_required
    def delete(self, dataset_id, meme_id):
        meme = Meme.query.filter_by(id=meme_id).first()
        db.session.delete(meme)
        db.session.commit()
        return '{"ok" : post deleted"}', 204

class MemesByDataset(restful.Resource):

    def get(self, id):
        print id, type(id)
        memes = Meme.query.filter_by(dataset_id=id).all()
        memes = MemeSerializer(memes, many=True).data
        return memes

api.add_resource(UserView, '/api/v1/users')
api.add_resource(SessionView, '/api/v1/sessions')

api.add_resource(DatasetListView, '/api/v1/datasets')
api.add_resource(DatasetView, '/api/v1/datasets/<int:id>')
api.add_resource(MemesByDataset, '/api/v1/datasets/<int:id>/memes')
api.add_resource(MemeView, '/api/v1/datasets/<int:dataset_id>/memes/<int:meme_id>')


class MemeTimeFramesList(restful.Resource):
    
    def get(self, dataset_id, meme_id):
        meme = Meme.query.filter_by(id=meme_id).first()
        meme= MemeSerializer(meme).data
        meme_data=mongo.db.memes.find_one({ "_id" : ObjectId(meme["data_mongo_id"]) })
        # print meme_data["timeframes"]
        rep=[ {"count":0, "timestamp":d["time"]} for d in meme_data["timeframes"]]

        return sorted(rep, key=lambda k: k['timestamp'])

class MemeTimeFramesView(restful.Resource):
    def get(self, dataset_id, meme_id, start, end):
        print  start, end
        meme = Meme.query.filter_by(id=meme_id).first()
        meme= MemeSerializer(meme).data
        meme_data=mongo.db.memes.find_one({ "_id" : ObjectId(meme["data_mongo_id"]) })

        # init
        dataService={}
        dataService["citations"]={}
        dataService["words"]={}

        dataService["citations"]["nodes"]=[]
        dataService["citations"]["edges"]=[]
        dataService["citations"]["index"]=[]

        dataService["words"]["nodes"]=[]
        dataService["words"]["edges"]=[]
        dataService["words"]["index"]=[]

        # dataService["wordsProvince"]={}
        # dataService["geo"]=[]

        # gather relevant timeframes
        for tf in meme_data["timeframes"]:

            d=tf["data"]

            current=datetime.fromtimestamp(int(tf["time"]))
            ts_start=datetime.fromtimestamp(start)
            ts_end=datetime.fromtimestamp(end)

            if current > ts_start and current < ts_end: 

                for cited in d["cited_nodes"]:
                    if cited["name"] not in dataService["citations"]["index"]:
                        dataService["citations"]["nodes"].append(cited);
                        dataService["citations"]["index"].append(cited["name"]);

                for edge in d["cited_edges"]:

                    if edge["source"] in dataService["citations"]["index"] and edge["target"] in dataService["citations"]["index"]:

                        existing_edge=next((item for item in dataService["citations"]["edges"] if item["source"] == edge["source"] and item["target"] == edge["target"]), None)

                        if existing_edge:
                            existing_edge["weight"]=existing_edge["weight"]+1
                        else :
                            dataService["citations"]["edges"].append(edge)


                for cited in d["words_nodes"]:
                    if cited["name"] not in dataService["words"]["index"]:
                        dataService["words"]["nodes"].append(cited);
                        dataService["words"]["index"].append(cited["name"]);

                for edge in d["words_edges"]:

                    if edge["source"] in dataService["words"]["index"] and edge["target"] in dataService["words"]["index"]:

                        existing_edge=next((item for item in dataService["words"]["edges"] if item["source"] == edge["source"] and item["target"] == edge["target"]), None)

                        if existing_edge:
                            existing_edge["weight"]=existing_edge["weight"]+1
                        else :
                            dataService["words"]["edges"].append(edge)


        return [dataService]

api.add_resource(MemeTimeFramesList, '/api/v1/datasets/<int:dataset_id>/memes/<int:meme_id>/timeframes')

api.add_resource(MemeTimeFramesView, '/api/v1/datasets/<int:dataset_id>/memes/<int:meme_id>/timeframes/<int:start>/<int:end>')

api.add_resource(MemeListView, '/api/v1/memes')
