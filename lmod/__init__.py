import os
import re

from collections import OrderedDict
from subprocess import Popen, PIPE

LMOD_CMD = os.environ['LMOD_CMD']
def module(command, arguments=()):
    cmd = [LMOD_CMD, 'python', '--terse', command]
    cmd.extend(arguments)

    result = Popen(cmd, stdout=PIPE, stderr=PIPE)
    if command in ('load', 'unload', 'restore', 'save'):
        exec(result.stdout.read())

    return result.stderr.read().decode()

def colosse_filter(entry):
    if entry.startswith('/software6/modulefiles'):
        entry = os.path.relpath(entry, '/software6/modulefiles')
    elif entry.startswith('/rap'):
        entry = 'Your groups\' modules'
    elif entry.startswith('/home'):
        entry = 'Your personal modules'
    if entry.startswith('Compilers'):
        entry = 'Compiler-dependent modules'
    if entry.startswith('Core'):
        entry = 'Core Modules'
    return entry

def module_avail(filter_=colosse_filter):
    string = module('avail')
    list_ = string.split()
    locations = OrderedDict()
    cur_location = None
    for i, entry in enumerate(list_):
        if entry.startswith('/'):
            cur_location = filter_(entry)
            if not cur_location in locations:
                locations[cur_location] = []
        elif (re.match("[A-Za-z\/]*", entry) and
              i != (len(list_) - 1) and
              list_[i+1].startswith(entry)):
            continue
        else:
            locations[cur_location].append(entry)

    for location in locations.keys():
        locations[location].sort()
    return locations

def module_list():
    return module('list').split()
