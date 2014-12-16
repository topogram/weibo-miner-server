#!/usr/bin/env python
# -*- coding: utf-8 -*-

from topogram import Topogram
from ..models import Topotype
from ..serializers import TopotypeSerializer

def get_analyzer(topotype_id):

    topotype = get_topotype(topotype_id)

    print "create topogram"

    # for t in topotype :
    #     print t, "  :  ", topotype[t]

    if type(topotype['languages'] is str) : languages = [topotype['languages']]
    else : languages = topotype['languages'].split(",")
    # print languages

    # print type(topotype['citation_patterns'])

    for v in list(topotype['citation_patterns']):
        citation_regexp=v["regexp"]

    # print citation_regexp

    # if type(topotype['stopwords']) is unicode : stopwords = [topotype['stopwords']]
    # else : stopwords = [str(w) for w in topotype['stopwords'].split(",")]
    # for w in stopwords : print type(w.encode("utf-8"))

    stopwords=[w.encode("utf-8") for w in topotype['stopwords'].split(",")]
    
    # create topogram object
    topo= Topogram(languages=languages, stopwords=stopwords, citation_regexp=citation_regexp)

    # TIMESTAMP
    topo.timestamp_column=topotype["timestamp_column"]    # timestamp column name
    topo.text_column=topotype["text_column"]
    topo.source_column=topotype["source_column"]
    topo.dest_column=topotype["dest_column"]

    if topotype['ignore_citations'] is not None :
        for ign in topotype['ignore_citations'] : #  cited to be ignored
            topo.add_citation_exception(ign)

    # add regexp to ignore
    for pattern in topotype["stop_patterns"]: 
        topo.set_stop_regexp(pattern["regexp"])

    topo.time_pattern=topotype["time_pattern"] # timestamp pattern

    return topo

def get_topotype(_id):
    """get the topotype data"""
    topotype = Topotype.query.filter_by(id=_id).first()
    topotype = TopotypeSerializer(topotype).data
    return topotype
