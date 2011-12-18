#!/usr/bin/python
#
# Read in the text file named 'hamlet'
# and perform word count on it, writing
# the JSON-ized results to stdout.
#
# Stephen Poletto (spoletto)
# Date: 12-17-2011

import json

fname = 'hamlet'

with open(fname) as f:
    content = f.readlines()
    word_counts = {}
    for line in content:
        for word in line.split(" "):
            if not word in word_counts:
                word_counts[word] = 0
            word_counts[word] += 1
    
    result = []
    for word in word_counts:
        result.append({"k":word, "v":word_counts[word]})
    print json.dumps(result)