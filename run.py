#!/usr/bin/env python
# -*- coding: utf-8 -*-

from server import app 
from server.resources.socket import socket 

if __name__ == '__main__':
    socket.run(app)
