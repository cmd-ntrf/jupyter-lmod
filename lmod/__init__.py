import os # require by lmod output evaluated by exec()
import sys

from functools import partial, wraps
from subprocess import Popen, PIPE

LMOD_SYSTEM_NAME = os.environ.get('LMOD_SYSTEM_NAME', '')
SITE_POSTFIX = os.path.join('lib', 'python'+sys.version[:3], 'site-packages')

def module(command, *args):
    cmd = (os.environ['LMOD_CMD'], 'python', '--terse', command)

    result = Popen(cmd + args, stdout=PIPE, stderr=PIPE)
    if command in ('load', 'unload', 'purge', 'restore', 'save'):
        try:
            exec(result.stdout.read())
        except NameError:
            pass

    return result.stderr.read().decode()

def update_sys_path(env_var, postfix=''):
    def decorator(function):
        @wraps(function)
        def wrapper(*args, **kargs):
            if env_var in os.environ:
                orig_paths = os.environ[env_var].split(os.pathsep)
                orig_paths = [os.path.join(path, postfix) for path in orig_paths]
            else:
                orig_paths = []
            output = function(*args, **kargs)
            if env_var in os.environ:
                new_paths = os.environ[env_var].split(os.pathsep)
                new_paths = [os.path.join(path, postfix) for path in new_paths]
            else:
                new_paths = []

            paths_to_del = set(orig_paths) - set(new_paths)
            paths_to_add = set(new_paths) - set(orig_paths)
            paths_to_add = [path for path in new_paths if path in paths_to_add]
            for path in paths_to_del:
                try:
                    sys.path.remove(path)
                except ValueError:
                    continue
            sys.path.extend(paths_to_add)
            return output
        return wrapper
    return decorator

def avail(*args):
    string = module('avail', *args)
    modules = []
    for entry in string.split():
        if not (entry.startswith('/') or
                entry.endswith('/') or
                "@" in entry):
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

@update_sys_path('PYTHONPATH')
@update_sys_path('EBPYTHONPREFIXES', SITE_POSTFIX)
def load(*args):
    output = module('load', *args)
    if output:
        print(output)

@update_sys_path('PYTHONPATH')
@update_sys_path('EBPYTHONPREFIXES', SITE_POSTFIX)
def restore(*args):
    output = module('restore', *args)
    if output:
        print(output)

def savelist():
    return module('savelist').split()

@update_sys_path('PYTHONPATH')
@update_sys_path('EBPYTHONPREFIXES', SITE_POSTFIX)
def unload(*args):
    output = module('unload', *args)
    if output:
        print(output)

@update_sys_path('PYTHONPATH')
@update_sys_path('EBPYTHONPREFIXES', SITE_POSTFIX)
def purge(force=False):
    if force:
        args = ('--force',)
    else:
        args = ()
    output = module('purge', *args)
    if output:
        print(output)

show = partial(module, 'show')
save = partial(module, 'save')
