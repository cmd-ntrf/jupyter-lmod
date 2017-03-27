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

def module_avail():
    string = module('avail')
    list_ = string.split()
    modules = []
    for i, entry in enumerate(list_):
        if entry.startswith('/') or (re.match("[A-Za-z\/]*", entry) and
                                     i != (len(list_) - 1) and
                                     list_[i+1].startswith(entry)):
            continue
        else:
            modules.append(entry)
    return modules

def module_list():
    string = module('list').strip()
    if string != "No modules loaded":
        return string.split()
    return []
