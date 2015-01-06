#!/usr/bin/env python
# -*- coding: utf-8 -*-

from marshmallow import Serializer, fields
from src.serializers.regexp import RegexpSerializer

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
