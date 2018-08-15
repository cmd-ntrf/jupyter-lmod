import os # require by lmod output evaluated by exec()
import sys

from functools import partial, wraps
from os import environ
from subprocess import Popen, PIPE

LMOD_SYSTEM_NAME = environ.get('LMOD_SYSTEM_NAME', '')

def module(command, *args):
    cmd = (environ['LMOD_CMD'], 'python', '--terse', command)

    result = Popen(cmd + args, stdout=PIPE, stderr=PIPE)
    if command in ('load', 'unload', 'purge', 'restore', 'save'):
        try:
            exec(result.stdout.read())
        except NameError:
            pass

    return result.stderr.read().decode()

def update_sys_path(function):
    @wraps(function)
    def wrapper(*args, **kargs):
        if 'PYTHONPATH' in os.environ:
            orig_python_path = os.environ['PYTHONPATH'].split(':')
        else:
            orig_python_path = []
        output = function(*args, **kargs)
        if 'PYTHONPATH' in os.environ:
            python_path = os.environ['PYTHONPATH'].split(':')
        else:
            python_path = []

        paths_to_del = set(orig_python_path) - set(python_path)
        paths_to_add = set(python_path) - set(orig_python_path)
        paths_to_add = [path for path in python_path if path in paths_to_add]
        for path in paths_to_del:
            sys.path.remove(path)
        sys.path.extend(paths_to_add)
        return output
    return wrapper

def avail():
    string = module('avail')
    modules = []
    for entry in string.split():
        if not (entry.startswith('/') or entry.endswith('/')):
            modules.append(entry)
    return modules

def list(hide_hidden=False):
    string = module('list').strip()
    if string != "No modules loaded":
        modules = string.split()
        if hide_hidden:
            modules = [m for m in modules if m.rsplit('/', 1)[-1][0] != '.']
        return modules
    return []

def freeze():
    header = ["import lmod", "lmod.purge(force=True)"]
    modules = list(hide_hidden=True)
    return "\n".join(header +
                     ["lmod.load('{}')".format(m) for m in modules])

@update_sys_path
def load(*args):
    return module('load', *args)

@update_sys_path
def restore(*args):
    return module('restore', *args)

def savelist():
    return module('savelist').split()

@update_sys_path
def unload(*args):
    return module('unload', *args)

@update_sys_path
def purge(force=False):
    if force:
        args = ('--force',)
    else:
        args = ()
    return module('purge', *args)

show = partial(module, 'show')
save = partial(module, 'save')
