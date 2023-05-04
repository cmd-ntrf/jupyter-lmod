import os
import re
import sys

from asyncio import create_subprocess_shell
from asyncio.subprocess import PIPE
from collections import OrderedDict
from functools import wraps

LMOD_CMD = os.environ["LMOD_CMD"]
LMOD_SYSTEM_NAME = os.environ.get("LMOD_SYSTEM_NAME", "")
SITE_POSTFIX = os.path.join("lib", "python" + sys.version[:3], "site-packages")

MODULE_REGEX = re.compile(r"^[\w\-_+.\/]{1,}[^\/:]$", re.M)
MODULE_HIDDEN_REGEX = re.compile(r"^(.+\/\..+|\..+)$", re.M)

EMPTY_LIST_STR = "No modules loaded"

async def module(command, *args):
    cmd = LMOD_CMD, "python", "--terse", command, *args

    proc = await create_subprocess_shell(
        " ".join(cmd), stdout=PIPE, stderr=PIPE
    )

    stdout, stderr = await proc.communicate()

    if command in ("load", "unload", "purge", "reset", "restore", "save", "use", "unuse"):
        try:
            exec(stdout.decode())
        except NameError:
            pass

    if stderr:
        return stderr.decode()


def update_sys_path(env_var, postfix=""):
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


class API(object):
    def __init__(self, show_cache_capacity=128):
        self.avail_cache = None
        self.list_cache = None
        self.savelist_cache = None
        self.show_cache = OrderedDict()
        self.show_cache_capacity = show_cache_capacity

    def invalidate_module_caches(self):
        self.avail_cache = None
        self.list_cache = None
        self.show_cache = OrderedDict()

    async def avail(self, *args):
        if self.avail_cache is None:
            string = await module("avail", *args)
            if string is not None:
                modules = MODULE_REGEX.findall(string.strip())
                modules.sort(key=lambda v: v.split("/")[0].lower())
            else:
                modules = []
            self.avail_cache = modules
        return self.avail_cache

    async def list(self, include_hidden=False):
        if self.list_cache is None:
            self.list_cache = {True: [], False: []}
            string = await module("list")
            if string and not string.startswith(EMPTY_LIST_STR):
                modules = string.split()
                self.list_cache[True] = modules
                self.list_cache[False] = [
                    name for name in modules
                    if not MODULE_HIDDEN_REGEX.match(name)
                ]
        return self.list_cache[include_hidden]

    async def freeze(self):
        modules = await self.list(include_hidden=False)
        return "\n".join(
            [
                "import lmod",
                "await lmod.purge(force=True)",
                "await lmod.load({})".format(str(modules)[1:-1]),
            ]
        )

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def load(self, *modules):
        output = await module("load", *modules)
        self.invalidate_module_caches()
        return output

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def reset(self):
        output = await module("reset")
        self.invalidate_module_caches()
        return output

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def restore(self, name):
        output = await module("restore", name)
        self.invalidate_module_caches()
        return output

    async def save(self, name):
        output = await module("save", name)
        self.savelist_cache = None
        return output

    async def savelist(self):
        if self.savelist_cache is None:
            string = await module("savelist")
            if string is not None:
                self.savelist_cache = string.split()
            else:
                self.savelist_cache = []
        return self.savelist_cache

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def unload(self, *modules):
        output = await module("unload", *modules)
        self.invalidate_module_caches()
        return output

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def purge(self, force=False):
        if force:
            args = ("--force",)
        else:
            args = ()
        output = await module("purge", *args)
        self.invalidate_module_caches()
        return output

    async def show(self, name):
        if not name in self.show_cache:
            result = await module("show", name)
            self.show_cache[name] = result
            self.show_cache.move_to_end(name)
            if len(self.show_cache) > self.show_cache_capacity:
                self.show_cache.popitem(last = False)
        return self.show_cache[name]

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def use(self, *paths, append=False):
        args = paths
        if append:
            args = '-a', *args
        output = await module("use", *args)
        self.invalidate_module_caches()
        return output

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def unuse(self, *paths):
        output = await module("unuse", *paths)
        self.invalidate_module_caches()
        return output


_lmod = API()

def print_output_decorator(function):
    @wraps(function)
    async def wrapper(*args, **kargs):
        output = function(*args, **kargs)
        if output is not None:
            print(output)
    return wrapper

avail = _lmod.avail
list = _lmod.list
freeze = _lmod.freeze
load = print_output_decorator(_lmod.load)
reset = print_output_decorator(_lmod.reset)
restore = print_output_decorator(_lmod.restore)
save = print_output_decorator(_lmod.save)
savelist = _lmod.savelist
unload = print_output_decorator(_lmod.unload)
purge = print_output_decorator(_lmod.purge)
show = _lmod.show
use = print_output_decorator(_lmod.use)
unuse = print_output_decorator(_lmod.unuse)
