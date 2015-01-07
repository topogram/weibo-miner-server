#!/usr/bin/env python
# -*- coding: utf-8 -*-

from marshmallow import Serializer, fields

from server.serializers.user import UserSerializer
from server.serializers.dataset import DatasetSerializer

class TopogramSerializer(Serializer):
    user = fields.Nested(UserSerializer)
    dataset = fields.Nested(DatasetSerializer)

    class Meta:
        fields = ("id", "description", "es_index_name", "es_query", "user", "dataset","dataset_id", "user_id", "created_at", "data_mongo_id", "records_count")
