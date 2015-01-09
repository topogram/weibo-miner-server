#!/usr/bin/env python
# -*- coding: utf-8 -*-

from server.forms.model import ModelForm
from server.models.regexp import Regexp

class RegexpCreateForm(ModelForm):
    class Meta:
        model = Regexp
