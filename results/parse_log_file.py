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

if len(sys.argv) < 3:
        print ""
        print "Usage : %s <job_log> <task_log>" % sys.argv[0]
        print ""
        sys.exit()

job_log_filename = sys.argv[1]
task_log_filename = sys.argv[2]

job_data = json.load(open(job_log_filename))
task_data = json.load(open(task_log_filename))

tasks = task_data.values()
tasks = filter(lambda t: 'end_store' in t, tasks)
tasks.sort(key=lambda t: t['end_fetch'])

job_data['map_start'] = tasks[0]['end_fetch']
map_time = job_data['map_complete'] - job_data['map_start']
shuffle_time = job_data['reduce_start'] - job_data['map_complete']
reduce_time = job_data['reduce_complete'] - job_data['reduce_start']
finalize_time = job_data['job_complete'] - job_data['reduce_complete']
total_time = job_data['job_complete'] - job_data['map_start']

total_time = float(total_time)

print "Total: \t%d"                % (total_time)
print ""
print "Map: \t\t%d\t%.2f%%"        % (map_time, map_time/total_time)
print "Shuffle: \t%d\t%.2f%%"      % (shuffle_time, shuffle_time/total_time)
print "Reduce: \t%d\t%.2f%%"       % (reduce_time, reduce_time/total_time)
print "Finalize: \t%d\t%.2f%%"     % (finalize_time, finalize_time/total_time)
print ""

# Oh no, we iterate over the data many times! Sue me.
def stats(tasks):
    fetch   = map(lambda t: t['end_fetch'] - t['start_fetch'], tasks)
    work    = map(lambda t: t['client_end'] - t['client_start'], tasks)
    store   = map(lambda t: t['end_store'] - t['start_store'], tasks)
    total   = map(lambda t: t['end_store'] - t['start_fetch'], tasks)

    def mean(x): return sum(x)/len(x)
    net_mean = mean(total)-(mean(fetch)+mean(work)+mean(store))

    print "Total:\t%f" % mean(total)
    print "#:\t%d" % len(tasks)
    print ""
    print "fetch:\t%f\t%.2f" % (mean(fetch), mean(fetch)/mean(total))
    print "work:\t%f\t%.2f" % (mean(work), mean(work)/mean(total))
    print "store:\t%f\t%.2f" % (mean(store), mean(store)/mean(total))
    print "net:\t%f\t%.2f" % (net_mean, net_mean/mean(total))
    print ""

print "All tasks"
stats(tasks)
print "Map tasks"
stats(filter(lambda t: t['phase'] == 'Map', tasks))
print "Reduce tasks"
stats(filter(lambda t: t['phase'] == 'Reduce', tasks))
