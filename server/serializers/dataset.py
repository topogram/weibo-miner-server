#!/usr/bin/env python
# -*- coding: utf-8 -*-

from server import mongo
from marshmallow import Serializer, fields
from server.serializers.user import UserSerializer

class DatasetSerializer(Serializer):
    user = fields.Nested(UserSerializer)

    class Meta:
        fields = ("id", "title", "filepath", "description", "index_name", "index_state", "user",  "source_column", "text_column", "time_column","time_pattern","language", "additional_columns", "created_at")

