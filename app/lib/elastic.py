#!/usr/bin/env python
# -*- coding: utf-8 -*-
 
import os
from ..server import app,elastic
import pandas as pd
import uuid

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
            
