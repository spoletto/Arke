#!/usr/bin/python
#
# Read in the text file named 'hamlet'
# and write the chunked, JSON-ized version
# to stdout.
#
# Stephen Poletto (spoletto)
# Date: 12-17-2011

import json

CHUNK_SIZE = 320
fname = 'hamlet'

with open(fname) as f:
    content = f.readlines()
    jsonArray = []
    currChunk = []
    for line in content:
        words = line.split(' ')
        for word in words:
            currChunk.append(word)
            if len(currChunk) >= CHUNK_SIZE:
                jsonDict = { "k":"key", "v":" ".join(currChunk) }
                jsonArray.append(jsonDict)
                currChunk = []
                
    print json.dumps(jsonArray)