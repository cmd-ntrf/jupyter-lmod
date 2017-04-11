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

def module_avail():
    string = module('avail')
    modules = []
    for entry in string.split():
        if not (entry.startswith('/') or entry.endswith('/')):
            modules.append(entry)
    return modules

def module_list():
    string = module('list').strip()
    if string != "No modules loaded":
        return string.split()
    return []

def module_savelist(system=LMOD_SYSTEM_NAME):
    names = module('savelist').split()
    if system:
        suffix = '.{}'.format(system)
        n = len(suffix)
        names = [name[:-n] for name in names if name.endswith(suffix)]
    return names

module_show = partial(module, 'show')
module_load = partial(module, 'load')
module_unload = partial(module, 'unload')
module_restore = partial(module, 'restore')
module_save = partial(module, 'save')
