from marshmallow import Serializer, fields
 
class UserSerializer(Serializer):
    class Meta:
        fields = ("id", "email")
 
class DatasetSerializer(Serializer):
    user = fields.Nested(UserSerializer)
 
    class Meta:
        fields = ("id", "title", "filepath", "description", "type", "user", "created_at")
