#!/usr/bin/env python
# -*- coding: utf-8 -*-

from marshmallow import Serializer, fields

from server.serializers.user import UserSerializer
from server.serializers.dataset import DatasetSerializer
from server.serializers.regexp import RegexpSerializer

class TopogramSerializer(Serializer):
    user = fields.Nested(UserSerializer)
    dataset = fields.Nested(DatasetSerializer)
    citations_patterns = fields.Nested(RegexpSerializer, many=True)

    class Meta:
        fields = ("id", "description", "es_index_name", "es_query", "user", "dataset","dataset_id", "user_id", "created_at", "records_count", "words_limit", "citations_limit", "words", "citations", "status", "citations_patterns")

