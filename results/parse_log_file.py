#!/usr/bin/python
#
# Parse a log file into something
# understandable by human beings.
# Human beings are such weird creatures,
# with their dislike for raw streams of
# numbers. It's insanity, I say!
#
# Stephen Poletto (spoletto)
# Date: 12-17-2011

from __future__ import division
import json
import sys

if len(sys.argv) < 2:
        print ""
        print "Usage : %s <log_file>" % sys.argv[0]
        print ""
        sys.exit()

log_filename = sys.argv[1]

print "Analyzing " + log_filename + "..."
print ""

log_data = json.load(open(log_filename))

time_fetching = 0
time_computing_map = 0
time_computing_reduce = 0
last_event_time = 0

for log_entry in log_data:
	if log_entry["type"] == "FETCH":
		pass
	elif log_entry["type"] == "START_Map":
		time_fetching += (log_entry['time'] - last_event_time)
	elif log_entry["type"] == "START_Reduce":
		time_fetching += (log_entry['time'] - last_event_time)
	elif log_entry["type"] == "COMPLETE_Map":
		time_computing_map += (log_entry['time'] - last_event_time)
	elif log_entry["type"] == "COMPLETE_Reduce":
		time_computing_reduce += (log_entry['time'] - last_event_time)
	last_event_time = log_entry['time']

time_computing = time_computing_map + time_computing_reduce
total_time = time_computing + time_fetching

print "Total time = " + str(total_time/1000) + " seconds."
print "Spent " + str(time_fetching/1000) + " seconds fetching data."
print "Spent " + str(time_computing_map/1000) + " seconds computing MAP."
print "Spent " + str(time_computing_reduce/1000) + " seconds computing REDUCE."
print ""

print "Percentage of time spent computing = " + str(time_computing/total_time * 100)
print "Percentage of computation time in MAP = " + str(time_computing_map/time_computing * 100)
print "Percentage of computation time in REDUCE = " + str(time_computing_reduce/time_computing * 100)
print ""
