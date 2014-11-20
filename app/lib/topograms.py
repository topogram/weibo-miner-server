#!/usr/bin/env python
# -*- coding: utf-8 -*-

from topogram import Topogram

def topoweibo():

    print "start weibo"

    # specific stopwords for weibo
    stopwords=["转发","微博","说 ","一个","【 ","年 ","转 ","请","＂ ","问题","知道","中 ","已经","现在","说","【",'＂',"年","中","今天","应该","真的","月","希望","想","日","这是","太","转","支持", "@", "。", "/", "！","？",".",",","?","、","。","“","”","《","》","！","，","：","；","？",":","；","[","]","；",".", ".","."]

    MentionPattern =r"@([^:：,，\)\(（）|\\\s]+)"

    # create topogram object
    weibo= Topogram(languages=["zh"], stopwords=stopwords, citation_regexp=MentionPattern)

    # TIMESTAMP
    weibo.timestamp_column="created_at"    # timestamp column name
    weibo.text_column="text"
    weibo.source_column="uid"
    weibo.additional_citations_column="retweeted_uid"

    # add citations to be ignored
    ignore=["ukn", "ukn：","ukn："]
    for ign in ignore :
        weibo.add_citation_exception(ign)

    # add regexp to ignore
    urlPattern=r"\b(([\w-]+://?|www[.])[^\s()<>]+(?:\([\w\d]+\)|([^\p{P}\s]|/)))"
    hashtagPattern=r"#([^#\s]+)#"
    weibo.set_stop_regexp(urlPattern)
    weibo.set_stop_regexp(hashtagPattern)

    # weibo.time_pattern="%Y-%m-%d %H:%M:%S" # timestamp pattern

    return weibo
