#!/usr/bin/env python
# -*- coding: utf-8 -*-

from marshmallow import Serializer, fields

class UserSerializer(Serializer):
    class Meta:
        fields = ("id", "email", "role")
