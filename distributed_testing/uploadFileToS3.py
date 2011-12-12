#! /usr/bin/python
#
# Handy utility script for uploading to Amazon S3.
#
# Stephen Poletto
# Date: 12-11-2011

from boto.s3.connection import S3Connection
import config
import sys

OUR_BUCKET_NAME = 'solvejs'
AWS_S3_URL = '.s3.amazonaws.com/'

if len(sys.argv) < 2:
        print ""
        print "Usage : %s <file_to_upload>" % sys.argv[0]
        print ""
        sys.exit()

filename = sys.argv[1]

print "Uploading file " + str(filename) + "..."

s3 = S3Connection(config.AWS_ACCESS_KEY, config.AWS_SECRET_KEY)
s3_bucket = s3.create_bucket(OUR_BUCKET_NAME)
key = s3_bucket.new_key(filename)
key.set_contents_from_filename(filename)
key.set_acl('public-read')

print "File now available at http://" + OUR_BUCKET_NAME + AWS_S3_URL + filename
