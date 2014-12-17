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
from flask import session, request

from server import app, api, db, flask_bcrypt, mongo, login_manager, socket
from models import User, Dataset, Topogram, Regexp, Topotype
from forms import UserCreateForm, SessionCreateForm, DatasetCreateForm, TopogramCreateForm, RegexpCreateForm
from serializers import UserSerializer, DatasetSerializer, TopogramSerializer,RegexpSerializer, TopotypeSerializer
from itsdangerous import URLSafeTimedSerializer
import sendgrid

from flask.ext.principal import Permission, RoleNeed
from flask.ext.principal import Principal, Identity, AnonymousIdentity, identity_changed, identity_loaded, RoleNeed, UserNeed

from flask.ext.socketio import send, emit
from lib.queue import RedisQueue

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
        safename = "".join([c for c in fileName if c.isalpha() or c.isdigit() or c==' ']).rstrip()
        es_index_name=(safename + "_"+ str(uuid.uuid4())).lower()

        # build_topo_index(file_path, form.topotype_id.data, es_index_name)

        # index file
        dataset = Dataset(form.title.data, form.topotype_id.data, form.description.data, es_index_name, str(file_path))

        db.session.add(dataset)
        db.session.commit()
        
        return DatasetSerializer(dataset).data, 201

class DatasetView(restful.Resource):

    @login_required
    def get(self, id):
        """
        GET 
        a Single dataset per ID

        params:
            to_index (true) : if to_index=true, the whole dataset will be indexed
            sample (true) : if sample=true, a sample of the dataset will be returned
        """

        datasets = Dataset.query.filter_by(id=id).first()
        dataset= DatasetSerializer(datasets).data

        # reset tasks queue
        q = RedisQueue('topogram:'+ dataset["index_name"])
        q.clean()


        if request.values.get('to_index') == "true" :
            print 'build topo index'
            build_topo_index(dataset["filepath"], dataset["topotype_id"], dataset["index_name"])

        if request.values.get('sample') == "true" :
            # get csv sample
            csv_file = csv.reader(open(dataset["filepath"]))
            csv_sample=[]
            fieldnames=csv_file.next() # get name

            for line in range(0,10):
                row={}
                for i,rec in enumerate(csv_file.next()):
                    row[fieldnames[i]] = rec
                csv_sample.append(row)
            dataset["csvSample"] = csv_sample

        es_info= get_index_info(dataset["index_name"])
        dataset["records_count"] = es_info["indices"][dataset["index_name"]]["docs"]["num_docs"]

        return dataset

    @login_required
    def delete(self, id):
        dataset = Dataset.query.filter_by(id=id).first()
        
        d= DatasetSerializer(dataset).data
        delete_index(d["index_name"])

        db.session.delete(dataset)
        db.session.commit()
        return '{"ok" : dataset deleted"}', 204

class DatasetEsView(restful.Resource) :
    @login_required
    def get(self, id):
        datasets = Dataset.query.filter_by(id=id).first()
        dataset= DatasetSerializer(datasets).data

        es_info= get_index_info(dataset["index_name"])

        return {
            "index_name" : dataset["index_name"],
            "count" : es_info["indices"][dataset["index_name"]]["docs"]["num_docs"]
            # "info" : es_info["indices"][dataset["index_name"]]
            # "info" : es_info[""]
            }

api.add_resource(DatasetEsView, '/api/v1/datasets/<int:id>/index')

class DatasetEsStart(restful.Resource):
    @login_required
    def get(self, id):
        datasets = Dataset.query.filter_by(id=id).first()
        dataset= DatasetSerializer(datasets).data
        # build_topo_index(dataset["filepath"], dataset["topotype_id"], dataset["index_name"])
        return {"status" : "started"}

api.add_resource(DatasetEsStart, '/api/v1/datasets/<int:id>/index/start')

class TopogramListView(restful.Resource):
    @login_required
    def get(self):
        topograms = Topogram.query.all()
        return TopogramSerializer(topograms, many=True).data

    @login_required
    def post(self):
        form = TopogramCreateForm()

        if not form.validate_on_submit():
            return form.errors, 422

        topogram = Topogram(form.dataset_id.data,form.description.data, str(form.es_index_name.data), form.es_query.data,  form.records_count.data, form.words_limit.data, form.citations_limit.data,form.words.data, form.citations.data)

        db.session.add(topogram)
        db.session.commit()

        return TopogramSerializer(topogram).data

class TopogramView(restful.Resource):

    @login_required
    def get(self, dataset_id, topogram_id):
        topogram = Topogram.query.filter_by(id=topogram_id).first()
        topogram= TopogramSerializer(topogram).data
        return topogram

    @login_required
    def delete(self, dataset_id, topogram_id):
        topogram = topogram.query.filter_by(id=topogram_id).first()
        db.session.delete(topogram)
        db.session.commit()
        return '{"ok" : post deleted"}', 204

class TopogramsByDataset(restful.Resource):

    def get(self, id):
        print id, type(id)
        topograms = Topogram.query.filter_by(dataset_id=id).all()
        topograms = TopogramSerializer(topograms, many=True).data
        return topograms


from threading import Thread

class TopogramNetworksView(restful.Resource):
    @login_required
    def post(self):

        form = TopogramCreateForm()
        if not form.validate_on_submit():
            return form.errors, 422

        # TODO : fix nasty fallback
        # print(form.words_limit, form.citations_limit) 
        if form.words_limit is None : 
            words_limit=100 
        else :
            words_limit=form.words_limit.data

        if form.citations_limit is None : 
            citations_limit=100
        else :
            citations_limit=form.citations_limit.data

        topo =get_topo_networks_from_es(form.es_query.data, form.topotype_id.data, str(form.es_index_name.data), words_limit, citations_limit)

        return topo

api.add_resource(TopogramNetworksView, '/api/v1/topograms/networks')

api.add_resource(UserView, '/api/v1/users')
api.add_resource(SessionView, '/api/v1/sessions')

api.add_resource(DatasetListView, '/api/v1/datasets')
api.add_resource(DatasetView, '/api/v1/datasets/<int:id>')
api.add_resource(TopogramsByDataset, '/api/v1/datasets/<int:id>/topograms')
api.add_resource(TopogramView, '/api/v1/datasets/<int:dataset_id>/topograms/<int:topogram_id>')


class TopogramTimeFramesList(restful.Resource):
    
    def get(self, dataset_id, Topogram_id):
        topogram = Topogram.query.filter_by(id=topogram_id).first()
        topogram= TopogramSerializer(topogram).data
        topogram_data=mongo.db.topograms.find_one({ "_id" : ObjectId(topogram["data_mongo_id"]) })
        # print Topogram_data["timeframes"]
        rep=[ {"count":0, "timestamp":d["time"]} for d in topogram_data["timeframes"]]

        return sorted(rep, key=lambda k: k['timestamp'])

class TopogramTimeFramesView(restful.Resource):
    def get(self, dataset_id, Topogram_id, start, end):
        print  start, end
        topogram = Topogram.query.filter_by(id=Topogram_id).first()
        topogram= TopogramSerializer(topogram).data
        topogram_data=mongo.db.topograms.find_one({ "_id" : ObjectId(topogram["data_mongo_id"]) })

        return timeframes_to_networks(Topogram_data)

api.add_resource(TopogramTimeFramesList, '/api/v1/datasets/<int:dataset_id>/topograms/<int:topogram_id>/timeframes')

api.add_resource(TopogramTimeFramesView, '/api/v1/datasets/<int:dataset_id>/topograms/<int:topogram_id>/timeframes/<int:start>/<int:end>')

api.add_resource(TopogramListView, '/api/v1/topograms')

class RegexpListView(restful.Resource):
    def post(self):
        form = RegexpCreateForm()

        if not form.validate_on_submit():
            return form.errors, 422

        regexp = Regexp(title=form.title.data, regexp=form.regexp.data)
        db.session.add(regexp)
        db.session.commit()
        return RegexpSerializer(regexp).data

    def get(self):
        try:
            regexps = Regexp.query.all()
            return RegexpSerializer(regexps, many=True).data
            
        except Exception as e:
            print e
            return '', 500

class RegexpView(restful.Resource):
    def get(self, id):
        print id, type(id)
        regexp = Regexp.query.filter_by(id=id).first()
        regexp= RegexpSerializer(regexp).data
        return regexp

api.add_resource(RegexpListView, '/api/v1/regexps')
api.add_resource(RegexpView, '/api/v1/regexps/<int:id>')

class TopotypeListView(restful.Resource):
    def get(self):
        try:
            topotypes = Topotype.query.all()
            print topotypes
            return TopotypeSerializer(topotypes, many=True).data
            
        except Exception as e:
            print e
            return '', 500

class TopotypeView(restful.Resource):
    def get(self, id):
        topotype = Topotype.query.filter_by(id=id).first()
        topotype= TopotypeSerializer(topotype).data
        return topotype

api.add_resource(TopotypeView, '/api/v1/topotypes/<int:id>')
api.add_resource(TopotypeListView, '/api/v1/topotypes')

class TestView(restful.Resource):
    def get(self):
        topotype = get_topotype(1)
        print type(topotype['stopwords'])
        # if type(topotype['stopwords'] is str) : stopwords = [topotype['stopwords']]
        # else : stopwords = topotype['stopwords'].split(",")]
        # retun


api.add_resource(TestView, '/api/v1/test')

# get_analyzer
