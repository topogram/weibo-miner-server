from flask import g
from wtforms.validators import Email
from server import db, flask_bcrypt, secret_key, mongo
from flask_restful_swagger import swagger
from flask.ext.login import UserMixin
from datetime import datetime
from itsdangerous import URLSafeTimedSerializer

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

@swagger.model
class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, info={'validators': Email()})
    password = db.Column(db.String(80), nullable=False)
    role = db.Column(db.String(120))
    datasets = db.relationship('Dataset', backref='user', lazy='dynamic')
    memes = db.relationship('Meme', backref='user', lazy='dynamic')
    active = db.Column(db.Boolean, unique=False, default=True)
    registered_on = db.Column(db.DateTime, default=db.func.now())
 
    def __init__(self, email=None, password=None, is_active=True):
        self.email = email
        self.password = flask_bcrypt.generate_password_hash(password)
        self.active = is_active
        self.role = "user"
 
    def __repr__(self):
        # return '<User %r>' % self.email
        return "<User('%d', '%s', '%s')>" % (self.id, self.email, self.role)

    def get_auth_token(self):
        """
        Encode a secure token for cookie
        """
        login_serializer = URLSafeTimedSerializer(secret_key)
        data = [str(self.id), self.password]
        return login_serializer.dumps(data)

    #############################################################
    # method required by flask-login
    #############################################################
    
    def is_authenticated(self):
        return True
    
    def is_anonymous(self):
        return False
    
    def is_active(self):
        return self.active
    
    def get_id(self):
        return unicode(self.id)

@swagger.model
class Dataset(db.Model):
    "Datasets (csv files) ..."
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    filepath = db.Column(db.String(120))
    index_name = db.Column(db.String(150))
    created_at = db.Column(db.DateTime, default=db.func.now())

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    topotype_id = db.Column(db.Integer, db.ForeignKey('topotype.id'), nullable=False)

    memes = db.relationship('Meme', backref='dataset', lazy='dynamic')

    # topotype = db.relationship('Topotype', backref='dataset', lazy='dynamic')

    def __init__(self, title, topotype_id, description, index_name, filepath):
        print topotype_id, type(topotype_id)
        self.title = title
        self.description = description
        self.topotype_id = int(topotype_id)
        self.filepath = filepath
        self.index_name = index_name
        self.user_id = g.user.id

    def __repr__(self):
        return '<Dataset %r>' % self.title

class Meme(db.Model):
    "Memes are visualisation of selected ..."
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.Text)
    es_index_name = db.Column(db.String(200), nullable=False)
    es_query = db.Column(db.String(150), nullable=False)

    data_mongo_id = db.Column(db.String(150))
    records_count = db.Column(db.Integer)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    dataset_id = db.Column(db.Integer, db.ForeignKey('dataset.id'))

    created_at = db.Column(db.DateTime, default=db.func.now())

    def __init__(self, dataset_id, description, es_index_name, es_query, data_mongo_id,records_count):
        # print dataset_id, description, es_index_name, es_query
        # print g.user.id, g.dataset_id
        self.description = description
        self.es_query = es_query
        self.es_index_name = es_index_name
        self.data_mongo_id = data_mongo_id
        self.records_count = records_count
        self.dataset_id = dataset_id
        self.user_id = g.user.id

 
    def __repr__(self):
        return '<Meme %r>' % self.id

class Topotype(db.Model):
    """Topotype are data mining profiles to extract topograms from data"""
    id = db.Column(db.Integer, primary_key=True)

    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    
    # main characteristics
    languages = db.Column(db.String(120), nullable=False) # list
    text_column = db.Column(db.String(120)) # text colum name

    # time
    timestamp_column = db.Column(db.String(120)) # column name
    time_pattern = db.Column(db.String(120)) # string like "%Y-%m-%d %H:%M:%S"

    # stop words and patterns
    stopwords = db.Column(db.Text) # list
    ignore_citations = db.Column(db.String(120)) # list
    stop_patterns = db.relationship('Regexp', backref='stop_patterns', lazy='dynamic', foreign_keys='Regexp.stop_patterns_id')# regexp ids

    # citations
    source_column = db.Column(db.String(120)) # source colum name
    dest_column = db.Column(db.String(120)) # dest colum name
    citation_patterns = db.relationship('Regexp', backref='citation_patterns', lazy='dynamic',foreign_keys='Regexp.citation_patterns_id') # regexp ids


    # backilnk
    # datasets = db.relationship('Dataset', backref='topotype_id', lazy='dynamic')
    datasets = db.relationship('Dataset', backref='topotype', lazy='dynamic', foreign_keys="Dataset.topotype_id")


    def __repr__(self):
        return '<Topotype (%r, %s)>' % (self.id, self.title)

class Regexp(db.Model):
    """ Regular expression for different uses """
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), unique=True, nullable=False)
    regexp = db.Column(db.String(120), nullable=False)
    citation_patterns_id = db.Column(db.Integer, db.ForeignKey('topotype.id'), index=True)
    stop_patterns_id = db.Column(db.Integer, db.ForeignKey('topotype.id'), index=True)


    # def __init__(self, title, regexp):
    #     self.title = title
    #     self.regexp = regexp

    def __repr__(self):
        return '<Regexp (%r, %s)>' % (self.id, self.title)

# class Topogram(mongo.Document):
#     created_at = mongo.DateTimeField(default=datetime.datetime.now, required=True)
#     title = mongo.StringField(max_length=255, required=True)
#     # slug = mongo.StringField(max_length=255, required=True)
#     # body = mongo.StringField(required=True)
#     # comments = db.ListField(db.EmbeddedDocumentField('Comment'))

#     def __unicode__(self):
#         return self.title

#     meta = {
#         'allow_inheritance': True,
#         'indexes': ['-created_at', 'slug'],
#         'ordering': ['-created_at']
#     }

