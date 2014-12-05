    
**Under Development** : see [topogram miner](https://github.com/topogram/topogram-miner) for the core tech

# Topogram

Data Visualization engine for content spread on social networks


## Features

See the [feature list](http://topogram.io)

Currently supported :

* Support Chinese Social Media (Sina Weibo, Tencent Weibo, etc.)
* Display keywords Frequency (Chinese and English language) 
* Show relationships between keywords, users and places
* Analyze the structure of discussions (interactions; number of comments, forwards)
* See the emergence of dynamics around words and users over time
* Geo-location and tweets mapping
* Upload your own data sets (csv and txt)
 
 
## Deploy

Run locally 

    git clone
    virtualenv venv
    . venv/bin/activate
    pip install -r requirements.txt
    
    pip install -r dev_requirements.txt
    python dev_run.py db 

## Test content creation

Regexps 

    curl -X POST http://localhost:5000/api/v1/regexps -d '{"regexp" : "ha", "title" : "ho" }' -H "Content-Type: application/json"

