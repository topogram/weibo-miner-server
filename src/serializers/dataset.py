#!/usr/bin/env python
# -*- coding: utf-8 -*-

from marshmallow import Serializer, fields
from src.serializers.user import UserSerializer
from src.serializers.topotype import TopotypeSerializer

class DatasetSerializer(Serializer):
    user = fields.Nested(UserSerializer)
    topotype = fields.Nested(TopotypeSerializer)

    class Meta:
        fields = ("id", "title", "filepath", "description", "topotype_id", "topotype", "index_name","user",  "created_at")
