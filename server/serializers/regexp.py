#!/usr/bin/env python
# -*- coding: utf-8 -*-

from marshmallow import Serializer, fields

class RegexpSerializer(Serializer):
    class Meta:
        fields = ("id", "title", "regexp")
