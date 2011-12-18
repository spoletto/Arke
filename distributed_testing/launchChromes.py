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

all_instances = [
	'ec2-107-20-23-108.compute-1.amazonaws.com',
	'ec2-184-73-44-173.compute-1.amazonaws.com',
	'ec2-184-73-0-176.compute-1.amazonaws.com',
	'ec2-107-22-93-180.compute-1.amazonaws.com',
	'ec2-50-17-36-88.compute-1.amazonaws.com',
	'ec2-174-129-96-234.compute-1.amazonaws.com',
	'ec2-50-19-74-30.compute-1.amazonaws.com',
	'ec2-174-129-91-238.compute-1.amazonaws.com',
	'ec2-184-72-85-89.compute-1.amazonaws.com',
	'ec2-107-22-7-170.compute-1.amazonaws.com',
	'ec2-50-17-60-195.compute-1.amazonaws.com',
	'ec2-184-73-121-244.compute-1.amazonaws.com',
	'ec2-107-21-72-9.compute-1.amazonaws.com',
	'ec2-75-101-195-77.compute-1.amazonaws.com',
	'ec2-107-22-73-187.compute-1.amazonaws.com',
    'ec2-184-73-108-126.compute-1.amazonaws.com',
    'ec2-184-72-191-50.compute-1.amazonaws.com',
	'ec2-50-16-112-185.compute-1.amazonaws.com',
	'ec2-184-73-73-171.compute-1.amazonaws.com',
	'ec2-50-17-66-173.compute-1.amazonaws.com'
]

INSTANCE_COUNT = 1

env.user = "ubuntu"
env.key_filename = "/Users/spoletto/.ssh/solvejs_client.pem"
env.hosts = all_instances[0:INSTANCE_COUNT]

@parallel
def launch_chrome(server_address='http://ec2-184-72-170-12.compute-1.amazonaws.com:8080/'):
    run('DISPLAY=:1 google-chrome ' + server_address + '')