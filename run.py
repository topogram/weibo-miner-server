#!/usr/bin/env python
# -*- coding: utf-8 -*-

from src.resources import app 
from src.resources.socket import socket 

if __name__ == '__main__':
    socket.run(app)
