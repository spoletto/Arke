#!/usr/bin/python
#
# Provided a list of EC2 instances in the
# env.hosts variable below, this fab file
# will establish multiple paralell SSH connections
# and launch an instance of google-chrome on each
# one. Chrome will load the URL provided as the
# 'server_address' argument to launch_chrome.
#
# Stephen Poletto (spoletto)
# Date: 12-18-2011

from fabric.api import *

env.user = "ubuntu"
env.key_filename = "/Users/spoletto/.ssh/solvejs_client.pem"
env.hosts = [
    'ec2-107-22-73-187.compute-1.amazonaws.com',
    'ec2-184-73-108-126.compute-1.amazonaws.com',
    'ec2-184-72-191-50.compute-1.amazonaws.com',
	'ec2-50-16-112-185.compute-1.amazonaws.com',
	'ec2-184-73-73-171.compute-1.amazonaws.com'
]

@parallel
def launch_chrome(server_address='http://ec2-184-72-170-12.compute-1.amazonaws.com:8080/'):
    run('DISPLAY=:1 google-chrome ' + server_address + '')