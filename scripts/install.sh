#!/bin/sh
# Install wrapper for topogram

# install python, got and pip
apt-get update
apt-get install build-essential git git-core python-dev python-setuptools python-pip

# install python dependencies
pip install -r requirements.txt
pip install fabric fabric-virtualenv

# install elasticsearch
wget https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-1.3.2.deb
dpkg -i elasticsearch-1.3.2.deb

# install node
apt-get install node

# install frontend dependencies (bower required)
npm install -g bower
bower install
