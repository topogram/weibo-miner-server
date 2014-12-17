#!/usr/bin/env python
# -*- coding: utf-8 -*-
 
import os
from ..server import app, elastic, mongo, socket
from ..lib.queue import RedisQueue
import pandas as pd
from flask.ext.socketio import send, emit
import uuid
from time import time
import json
import csv

from topograms import get_analyzer, get_topotype

def get_index_info( es_index_name):
        res = elastic.status(es_index_name)
        # if res["errors"] is "True": print res
        return res 

def delete_index( es_index_name):
    res = elastic.delete_index(es_index_name)
    return res 

def build_es_index_from_csv(raw_data_path, data_type, es_index_name ):

    topotype=get_topotype(data_type)
    print topotype

    created_at=topotype["timestamp_column"] 
    print created_at
    
    # topotype['time_pattern']
    # datetime.datetime.strptime(created_at, topotype['time_pattern'])
    # =df[created_at].str.replace(" ", "T")

    # size of CSV chunk to process
    chunksize=1000

    # init ElasticSearch
    print elastic
    print raw_data_path
    print es_index_name

    # open csv file with pandas
    csv_filepath=os.path.join(app.config["UPLOAD_FOLDER"], raw_data_path)
    csvfile=pd.read_csv(csv_filepath, iterator=True, chunksize=chunksize) 

    # parse file
    for i,df in enumerate(csvfile):

        # df[created_at]=pd.to_datetime(df[created_at])
        df[created_at]=df[created_at].str.replace(" ", "T")

        # get records
        records=df.where(pd.notnull(df), None).T.to_dict()

        # convert json object to a list of json objects
        list_records=[records[it] for it in records]

        # print list_records
        
        # insert into elasticsearch
        # elastic.indices.create(index=es_index_name)

        res = elastic.bulk_index(es_index_name, "message", list_records)
        if res["errors"] is "True": print res 

def es2mongo(query, index_name, data_mongo_id):
    t0=time()
    chunksize=200

    print query, index_name, data_mongo_id

    # Get the number of results
    res = elastic.search(query,index=index_name)
    data_size=res['hits']['total']
    print "Total %d Hits from %s" % (data_size, index_name)

    # prevent empty results
    # if data_size==0:continue 

    for chunk in xrange(0, data_size, chunksize):
        
        print chunk
        if chunk > 5000 : break

        # display progress as percent
        per=round(float(chunk)/data_size*100, 1)

        # request data
        res=elastic.search(query, index=index_name, size=chunksize, es_from=chunk)

        print "%.01f %% %d Hits Retreived - fiability %.3f" % (per,chunk, res['hits']['hits'][0]["_score"])

        if res['hits']['hits'][0]["_score"] < 0.2 : break

        # get headers
        # if i==0 : headers=[value for value in res['hits']['hits'][0]["_source"]]

        for sample in res['hits']['hits']:
            row={}
            for id in sample["_source"]:
                if type(sample["_source"][id]) == unicode : data = sample["_source"][id].encode("utf-8") 
                else : data = sample["_source"][id] 
                row[id]=data
            print row

            # store in Mongo
            mongo.db.memes.update({"_id": data_mongo_id}, {'$addToSet': {'messages':row }})

    print "Done in %.3fs. Data stored in MongoDB"%(time()-t0)
    return data_size

def es2csv(meme_name, query, indexes_names, csv_file, log_file):


    # Open a csv file and write the stuff inside
    with open(csv_file, 'wb') as csvfile: 

        filewriter = csv.writer(csvfile)

        for i,index_name in enumerate(indexes_names):
            
            # Get the number of results
            res = es.search(index=index_name, q=query)
            data_size=res['hits']['total']
            print "Total %d Hits from %s" % (data_size, index_name)

            if data_size==0:continue #avoid empty results

            # file headers
            if i==0 : 
                # get headers
                headers=[value for value in res['hits']['hits'][0]["_source"]]

                # create column header row
                filewriter.writerow(headers)

            # Get numbers of results 
            for chunk in xrange(0,data_size,chunksize):
                
                # display progress as percent
                per=round(float(chunk)/data_size*100, 1)

                # request data
                res=es.search(index=index_name, q=query, size=chunksize, from_=chunk)

                print"%.01f %% %d Hits Retreived - fiability %.3f" % (per,chunk, res['hits']['hits'][0]["_score"])
                # if res['hits']['hits'][0]["_score"] < 0.2 : break

                for sample in res['hits']['hits']: 
                    row=[]
                    for id in sample["_source"]:
                        if type(sample["_source"][id]) == unicode : data = sample["_source"][id].encode("utf-8") 
                        else : data = sample["_source"][id] 
                        row.append(data)

                    filewriter.writerow(row)

            # Write log file
            with open(log_file, 'ab') as logfile: 
                logfile.write("index_name : %s \n"%index_name)
                logfile.write("meme_name : %s \n"% meme_name)
                logfile.write("query : %s \n"% query)
                logfile.write("%.01f %% %d Hits Retreived - fiability %.3f \n" % (per,chunk, res['hits']['hits'][0]["_score"]) )
                logfile.write("Done. Data saved in %s \n"%csv_file)

    print "Done. Data saved in %s"%csv_file
    print "Log is stored at %s"%log_file

def es2topogram(query, type_id, index_name, data_mongo_id):

    res = elastic.search(query,index=index_name)
    data_size=res['hits']['total']
    print "Total %d Hits from %s" % (data_size, index_name)
    print type(res['hits']["hits"])
    # print "len res", len(res['hits']["hits"])

    topo=get_analyzer(type_id)

    chunksize=1000

    for chunk in xrange(0, data_size, chunksize):

        # display progress as percent
        per=round(float(chunk)/data_size*100, 1)

        # request data
        res=elastic.search(query, index=index_name, size=chunksize, es_from=chunk)

        print "%.01f %% %d Hits Retreived - fiability %.3f" % (per,chunk, res['hits']['hits'][0]["_score"])

        if res['hits']['hits'][0]["_score"] < 0.2 : break

        for message in res['hits']["hits"]:
            # print message
            topo.process(message["_source"])

    topo.create_networks()
    topo.create_timeframes()

    # test_id=db.test.insert(json.loads(topo.to_JSON()))
    mongo.db.memes.update({
                   '_id':data_mongo_id
                   },{
                   '$set':{
                    "timeframes": json.loads(topo.timeframes_to_JSON())
                     }
                })
    print "updated mongo record with %d timeframes"%len(topo.timeframes )
    # print weibo.timeframes_to_JSON()


    return data_size

def build_topo_index(raw_data_path, type_id, es_index_name ):
    """ extract knowledge and index topograms elements in elasticsearch"""

    topotype=get_topotype(type_id)
    # print topotype

    created_at=str(topotype["timestamp_column"])
    print type(created_at)

    topo=get_analyzer(type_id)
    print topo.source_column

    csv_filepath=os.path.join(app.config["UPLOAD_FOLDER"], raw_data_path)
    # chunksize=100

    records=[]
    errors = 0
    with open(csv_filepath, "r") as f:

        reader = csv.DictReader(f)
        for message in reader:
            message[created_at.decode("utf-8")]=message[created_at].replace(" ", "T")
            topodata=topo.process(message)
            record=dict(message, **topodata)

            try :
                res = elastic.index(es_index_name, "message", record)
            except UnicodeDecodeError:
                print "error unicode"
                errors+=1
                # if res["errors"] is "True": print res 
            records.append(record)
    
    print "%d records on %s"%(len(records ), es_index_name)
    print "%d errors"%errors 

    print 

def get_topo_networks_from_es(query, type_id, index_name, words_limit, citations_limit):
    """ 
        Create networks in d3 format from ES query 
        
        type_id               : topotype id
        index_name       : elasticsearch index name
        words_limit         : max size of words networks
        citations_limit     : max size of citations networks
    
    """

    res = elastic.search(query,index=index_name)
    data_size=res['hits']['total']
    print "Total %d Hits from %s" % (data_size, index_name)
    print type(res['hits']["hits"])


    # redis queue for push notifications 
    q = RedisQueue('topogram:'+index_name)
    q.clean()

    # setup topotype analyzer
    topo=get_analyzer(type_id)
    topo.words_limit = words_limit
    topo.citations_limit = citations_limit 

    # process by chunk to free more memory
    chunksize=200

    for chunk in xrange(0, data_size, chunksize):
        i=0
        # display progress as percent
        per=round(float(chunk)/data_size*100, 1)

        # request data
        res=elastic.search(query, index=index_name, size=chunksize, es_from=chunk)
        # some log
        print "%.01f %% %d Hits Retreived - fiability %.3f" % (per,chunk, res['hits']['hits'][0]["_score"])

        # minimum fiability request
        if res['hits']['hits'][0]["_score"] < 0.2 : break


        messages=[]
        for message in res['hits']["hits"]:
            i=i+1
            topo.load_from_processed(message["_source"])
            
            if i%50 ==0:
                per_ok=round(float(chunk+i )/ data_size*100, 1)
                q.put(json.dumps({"percent" : per_ok, "current" : chunk+i, "total" : data_size }))

    return topo.get_d3_networks()

def timeframes_to_networks(timeframes):
        # init
        dataService={}
        dataService["citations"]={}
        dataService["words"]={}

        dataService["citations"]["nodes"]=[]
        dataService["citations"]["edges"]=[]
        dataService["citations"]["index"]=[]

        dataService["words"]["nodes"]=[]
        dataService["words"]["edges"]=[]
        dataService["words"]["index"]=[]

        # dataService["wordsProvince"]={}
        # dataService["geo"]=[]

        # gather relevant timeframes
        for tf in timeframes:

            d=tf["data"]

            current=datetime.fromtimestamp(int(tf["time"]))
            ts_start=datetime.fromtimestamp(start)
            ts_end=datetime.fromtimestamp(end)

            if current > ts_start and current < ts_end: 

                for cited in d["cited_nodes"]:
                    if cited["name"] not in dataService["citations"]["index"]:
                        dataService["citations"]["nodes"].append(cited);
                        dataService["citations"]["index"].append(cited["name"]);

                for edge in d["cited_edges"]:

                    if edge["source"] in dataService["citations"]["index"] and edge["target"] in dataService["citations"]["index"]:

                        existing_edge=next((item for item in dataService["citations"]["edges"] if item["source"] == edge["source"] and item["target"] == edge["target"]), None)

                        if existing_edge:
                            existing_edge["weight"]=existing_edge["weight"]+1
                        else :
                            dataService["citations"]["edges"].append(edge)


                for cited in d["words_nodes"]:
                    if cited["name"] not in dataService["words"]["index"]:
                        dataService["words"]["nodes"].append(cited);
                        dataService["words"]["index"].append(cited["name"]);

                for edge in d["words_edges"]:

                    if edge["source"] in dataService["words"]["index"] and edge["target"] in dataService["words"]["index"]:

                        existing_edge=next((item for item in dataService["words"]["edges"] if item["source"] == edge["source"] and item["target"] == edge["target"]), None)

                        if existing_edge:
                            existing_edge["weight"]=existing_edge["weight"]+1
                        else :
                            dataService["words"]["edges"].append(edge)


        return [dataService]
