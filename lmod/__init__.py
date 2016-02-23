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

def module_avail():
    string = module('avail')
    list_ = string.split()
    locations = OrderedDict()
    cur_location = None
    for i, entry in enumerate(list_):
        if entry.startswith('/'):
            if entry.startswith('/software6/modulefiles'):
                entry = os.path.relpath(entry, '/software6/modulefiles')
            cur_location = entry
            locations[cur_location] = []
        elif (re.match("[A-Za-z\/]*", entry) and
              i != (len(list_) - 1) and
              list_[i+1].startswith(entry)):
            continue
        else:
            locations[cur_location].append(entry)
    return locations

def module_list():
    return set(module('list').split())
