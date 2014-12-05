#!/usr/bin/env python
# -*- coding: utf-8 -*-

from topogram import Topogram

def create_topogram(_languages, _stopwords, _citation_pattern):

    print "create topogram"

    # create topogram object
    topo= Topogram(languages=_languages, stopwords=_stopwords, citation_regexp=_citation_pattern)

    # TIMESTAMP
    topo.timestamp_column="created_at"    # timestamp column name
    topo.text_column="text"
    topo.source_column="uid"
    topo.dest_column="retweeted_uid"

    for ign in ignore_citations : #  cited to be ignored
        topo.add_citation_exception(ign)

    # add regexp to ignore
    for pattern in stop_patterns: 
        topo.set_stop_regexp(pattern)

    topo.time_pattern=time_pattern # timestamp pattern

    return topo
