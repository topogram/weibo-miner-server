#!/usr/bin/env python
# -*- coding: utf-8 -*-
 
import os
from ..server import app,elastic,mongo
import pandas as pd
import uuid
from time import time

def build_es_index_from_csv(raw_data_path, es_index_name, data_type="message" ):

    # size of CSV chunk to process
    chunksize=1000

    # init ElasticSearch
    print elastic
    print raw_data_path
    print es_index_name

    # open csv file with pandas
    csv_filepath=os.path.join(app.config["UPLOAD_FOLDER"], raw_data_path)
    csvfile=pd.read_csv(csv_filepath, iterator=True, chunksize=chunksize) 

    # flag file
    # if filename[-10:] != "processing": 
    #     os.rename(csv_file, csv_file+".processing")
    #     csv_file=os.path.join(TOPOGRAM_UPLOADS_FOLDER, raw_data_path+".processing")

    # parse file
    for i,df in enumerate(csvfile):
        
        # fix the date formatting
        df["created_at"]=df["created_at"].str.replace(" ", "T")

        # get records
        records=df.where(pd.notnull(df), None).T.to_dict()

        # convert json object to a list of json objects
        list_records=[records[it] for it in records]
        # print list_records

        # insert into elasticsearch
        # elastic.indices.create(index='myindex', ignore=400)

        elastic.bulk_index(es_index_name,data_type,list_records)
        try :
            # elastic.indices.create(index='myindex', ignore=400)
            raw_data_path
        except :
            print "error with elasticsearch"

def es2mongo(query, index_name, data_mongo_id):
    t0=time()
    chunksize=1000

    print query, index_name, data_mongo_id

    # Get the number of results
    res = elastic.search(query,index=index_name)
    data_size=res['hits']['total']
    print "Total %d Hits from %s" % (data_size, index_name)

    # prevent empty results
    # if data_size==0:continue 

    for chunk in xrange(0, data_size, chunksize):
        
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
