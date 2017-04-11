import os # require by lmod output evaluated by exec()

from functools import partial
from os import environ
from subprocess import Popen, PIPE

LMOD_SYSTEM_NAME = environ.get('LMOD_SYSTEM_NAME', '')

def module(command, *args):
    cmd = (environ['LMOD_CMD'], 'python', '--terse', command)

    result = Popen(cmd + args, stdout=PIPE, stderr=PIPE)
    if command in ('load', 'unload', 'restore', 'save'):
        exec(result.stdout.read())

    return result.stderr.read().decode()

def avail():
    string = module('avail')
    modules = []
    for entry in string.split():
        if not (entry.startswith('/') or entry.endswith('/')):
            modules.append(entry)
    return modules

def list():
    string = module('list').strip()
    if string != "No modules loaded":
        return string.split()
    return []

def savelist(system=LMOD_SYSTEM_NAME):
    names = module('savelist').split()
    if system:
        suffix = '.{}'.format(system)
        n = len(suffix)
        names = [name[:-n] for name in names if name.endswith(suffix)]
    return names

show = partial(module, 'show')
load = partial(module, 'load')
unload = partial(module, 'unload')
restore = partial(module, 'restore')
save = partial(module, 'save')
