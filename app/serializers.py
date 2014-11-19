from marshmallow import Serializer, fields
 
class UserSerializer(Serializer):
    class Meta:
        fields = ("id", "email")
 
class DatasetSerializer(Serializer):
    user = fields.Nested(UserSerializer)
 
    class Meta:
        fields = ("id", "title", "filepath", "description", "type", "index_name", "user", "created_at")

class MemeSerializer(Serializer):
    user = fields.Nested(UserSerializer)
    dataset = fields.Nested(DatasetSerializer)
 
    class Meta:
        fields = ("id", "description", "es_index_name", "es_query", "user", "dataset","dataset_id", "user_id", "created_at")
