import asyncio
import os
import sys

from collections import OrderedDict
from functools import partial, wraps

LMOD_SYSTEM_NAME = os.environ.get("LMOD_SYSTEM_NAME", "")
SITE_POSTFIX = os.path.join("lib", "python" + sys.version[:3], "site-packages")


async def module(command, *args):
    cmd = os.environ["LMOD_CMD"], "python", "--terse", command, *args

    proc = await asyncio.create_subprocess_shell(
        " ".join(cmd), stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )

    stdout, stderr = await proc.communicate()

    if command in ("load", "unload", "purge", "restore", "save"):
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
            modules = []
            for entry in string.split():
                if not (entry.startswith("/") or entry.endswith("/") or "@" in entry):
                    modules.append(entry)
            modules.sort(key=lambda v: v.split("/")[0])
            self.avail_cache = modules
        return self.avail_cache

    async def list(self, hide_hidden=False):
        if self.list_cache is None:
            string = await module("list")
            string = string.strip()
            if string != "No modules loaded":
                modules = string.split()
                if hide_hidden:
                    modules = [m for m in modules if m.rsplit("/", 1)[-1][0] != "."]
                self.list_cache = modules
            else:
                self.list_cache = []
        return self.list_cache

    async def freeze(self):
        modules = await self.list(hide_hidden=True)
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
        if output:
            print(output)
        self.invalidate_module_caches()

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def reset(self):
        output = await module("reset")
        if output:
            print(output)
        self.invalidate_module_caches()

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def restore(self, name):
        output = await module("restore", name)
        if output:
            print(output)
        self.invalidate_module_caches()

    async def save(self, name):
        output = await module("save", name)
        if output:
            print(output)
        self.savelist_cache = None

    async def savelist(self):
        if self.savelist_cache is None:
            string = await module("savelist")
            self.savelist_cache = string.split()
        return self.savelist_cache

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def unload(self, *modules):
        output = await module("unload", *modules)
        if output:
            print(output)
        self.invalidate_module_caches()

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def purge(self, force=False):
        if force:
            args = ("--force",)
        else:
            args = ()
        output = await module("purge", *args)
        if output:
            print(output)
        self.invalidate_module_caches()

    async def show(self, name):
        if not name in self.show_cache:
            result = await module("show", name)
            self.show_cache[name] = result
            self.show_cache.move_to_end(name)
            if len(self.show_cache) > self.show_cache_capacity:
                self.show_cache.popitem(last = False)
        return self.show_cache[name]


_lmod = API()

avail = _lmod.avail
list = _lmod.list
freeze = _lmod.freeze
load = _lmod.load
reset = _lmod.reset
restore = _lmod.restore
save = _lmod.save
savelist = _lmod.savelist
unload = _lmod.unload
purge = _lmod.purge
show = _lmod.show
