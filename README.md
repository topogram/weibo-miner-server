# Topogram

Web-based dashboard for visualization of data as networks (words, users, geo maps).

* Social Media analysis (support for Twitter,  Sina Weibo, Tencent Weibo, etc.)
* Scientific Papers citations
* Mailing list mining

Website : [http://topogram.io](http://topogram.io)


## Features

This dashboard provides a complete interface to create data visualizations by uploading CSV files, search keywords and create geographical and networks maps. It is based on the [topogram](https://github.com/topogram/topogram) lib.

Currently supported :

* Upload of data sets (csv, txt)
* Show relationships between keywords, users and places
* Analyze the structure of discussions (interactions; number of comments, forwards)
* Indexation for full-text search
* Keywords extraction (Chinese and English language)
* See the emergence of dynamics around words and users over time
* Geo-location and tweets mapping

## Run you own instance

You can easily run ```Topogram``` on your own machine at [http://localhost:5000]( http://localhost:5000)

    git clone http://github.com/topogram/topogram-server
    cd topogram-server
    pip install -r requirements.txt
    python run.py

The first user created wil get admin rights and therefore will be able to access ```/admin``` control panel.

###  Tests

    pip install -r dev_requirements.txt
    python manage.py tests

### Emails

Emailing is handle by [Mailgun](http://mailgun.com).
