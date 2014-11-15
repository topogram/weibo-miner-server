from flask.ext.wtf import Form
from flask_wtf.file import FileField, FileAllowed, FileRequired
from flask.ext.uploads import UploadSet, DATA

from wtforms_alchemy import model_form_factory
from wtforms import StringField
from wtforms.validators import DataRequired
 
from app.server import db
from models import User, Dataset
 
BaseModelForm = model_form_factory(Form)
 
class ModelForm(BaseModelForm):
    @classmethod
    def get_session(self):
        return db.session
 
class UserCreateForm(ModelForm):
    class Meta:
        model = User
    invite=StringField('invite', validators=[DataRequired()])
 
class SessionCreateForm(Form):
    email = StringField('email', validators=[DataRequired()])
    password = StringField('password', validators=[DataRequired()])

datasets = UploadSet('data', DATA)


class DatasetCreateForm(ModelForm):
    class Meta:
        model = Dataset
    dataset = FileField("dataset", validators=[DataRequired()])
