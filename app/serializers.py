from marshmallow import Serializer, fields
 
class UserSerializer(Serializer):
    class Meta:
        fields = ("id", "email", "role")
 
class DatasetSerializer(Serializer):
    user = fields.Nested(UserSerializer)

    class Meta:
        fields = ("id", "title", "filepath", "description", "type", "index_name","user", "created_at")

class MemeSerializer(Serializer):
    user = fields.Nested(UserSerializer)
    dataset = fields.Nested(DatasetSerializer)

    class Meta:
        fields = ("id", "description", "es_index_name", "es_query", "user", "dataset","dataset_id", "user_id", "created_at", "data_mongo_id", "records_count")

class RegexpSerializer(Serializer):
    class Meta:
        fields = ("id", "title", "regexp")

class TopotypeSerializer(Serializer):
    
    stop_patterns=fields.Nested(RegexpSerializer, many=True)
    citation_patterns=fields.Nested(RegexpSerializer, many=True)

    class Meta:
        fields = ("id",
     "title", 
     "description",
     "languages",
     "text_column",
     "timestamp_column",
     "time_pattern",
     "stopwords",
     "ignore_citations",
     "stop_patterns",
     "source_column",
     "dest_column",
     "citation_patterns"
     )
