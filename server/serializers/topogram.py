#!/usr/bin/env python
# -*- coding: utf-8 -*-

from marshmallow import Serializer, fields

from server.serializers.user import UserSerializer
from server.serializers.dataset import DatasetSerializer
# from server.serializers.regexp import RegexpSerializer

import pickle 

class TopogramSerializer(Serializer):
    user = fields.Nested(UserSerializer)
    dataset = fields.Nested(DatasetSerializer)
    # citations_patterns = fields.Nested(RegexpSerializer, many=True)

    class Meta:
        fields = ("id", "description", "user", "dataset","dataset_id", "user_id", "created_at", "words_limit", "citations_limit", "words", "citations", "status", "networks", "stopwords")

