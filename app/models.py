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
    description = db.Column(db.Text, nullable=False)
    filepath = db.Column(db.String(120))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    created_at = db.Column(db.DateTime, default=db.func.now())

    def __init__(self, title, type, description, filepath):
        self.title = title
        self.description = description
        self.type = type
        self.filepath = filepath
        self.user_id = g.user.id
 
    def __repr__(self):
        return '<Dataset %r>' % self.title
