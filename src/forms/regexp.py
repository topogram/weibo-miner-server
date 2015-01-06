#!/usr/bin/env python
# -*- coding: utf-8 -*-

from src.forms.model import ModelForm
from src.models.regexp import Regexp

class RegexpCreateForm(ModelForm):
    class Meta:
        model = Regexp
