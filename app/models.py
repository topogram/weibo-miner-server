from flask import g
from wtforms.validators import Email
from server import db, flask_bcrypt
from flask_restful_swagger import swagger
 
@swagger.model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, info={'validators': Email()})
    password = db.Column(db.String(80), nullable=False)
    datasets = db.relationship('Dataset', backref='user', lazy='dynamic')
    memes = db.relationship('Meme', backref='user', lazy='dynamic')
    memes = db.relationship('Meme', backref='user', lazy='dynamic')
 
    def __init__(self, email, password):
        self.email = email
        self.password = flask_bcrypt.generate_password_hash(password)
 
    def __repr__(self):
        return '<User %r>' % self.email

@swagger.model
class Dataset(db.Model):
    "Datasets (csv files) ..."
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    type = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    filepath = db.Column(db.String(120))
    index_name = db.Column(db.String(150))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=db.func.now())
    memes = db.relationship('Meme', backref='dataset', lazy='dynamic')

    def __init__(self, title, type, description, index_name, filepath):
        self.title = title
        self.description = description
        self.type = type
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


