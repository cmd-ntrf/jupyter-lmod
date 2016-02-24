import os
import re

from collections import OrderedDict
from subprocess import Popen, PIPE


def module(command, arguments=""):
    result = Popen('$LMOD_CMD python --terse {} {}'.format(command,
                                                           arguments),
                   shell=True,
                   stdout=PIPE,
                   stderr=PIPE,
                   bufsize=-1)
    if command == 'load' or command == 'unload':
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
    return locations

def module_list():
    return module('list').split()
