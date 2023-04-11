"""API for module commands"""

import os
import re
import sys

from asyncio import create_subprocess_shell
from asyncio.subprocess import PIPE
from collections import OrderedDict
from functools import wraps

# Check for LMOD_CMD for lmod and MODULES_CMD for environment modules (tmod)
try:
    MODULE_CMD = os.environ["LMOD_CMD"]
    MODULE_SYSTEM = 'lmod'
    EMPTY_LIST_STR = 'No modules loaded'
    # MODULE_SYSTEM_NAME = os.environ.get("LMOD_SYSTEM_NAME", "")
except KeyError:
    try:
        MODULE_CMD = os.environ["MODULES_CMD"]
        MODULE_SYSTEM = 'tmod'
        EMPTY_LIST_STR = 'No Modulefiles Currently Loaded.'
        # No such variable for tmod
        # MODULE_SYSTEM_NAME = ""
    except KeyError:
        MODULE_CMD = ''
        MODULE_SYSTEM = ''
        EMPTY_LIST_STR = 'No module system found'
        print(
            "No module system found. Make sure environment variables "
            "LMOD_CMD for lmod or MODULES_CMD for tmod are set"
        )

SITE_POSTFIX = os.path.join("lib", "python" + sys.version[:3], "site-packages")

# NOTE: Try to make these configurable as this can be platform dependent?
MODULE_REGEX = re.compile(r"^[\w\-_+.\/]{1,}[^\/:]$", re.M)
MODULE_HIDDEN_REGEX = re.compile(r"^(.+\/\..+|\..+)$", re.M)


async def module(command, *args):
    """
    Main entry point to execute different subcommands of module.

    :param command: Subcommand of module
    :type command: list
    :return: Error message if command execution failed
    :rtype: str
    """
    # If MODULE_CMD is empty return
    if not MODULE_CMD:
        return 'Module system not found'

    cmd = MODULE_CMD, "python", "--terse", command, *args

    proc = await create_subprocess_shell(
        " ".join(cmd), stdout=PIPE, stderr=PIPE
    )

    stdout, stderr = await proc.communicate()

    if command in ("load", "unload", "purge", "reset", "restore", "save",
                   "use", "unuse"):
        try:
            exec(stdout.decode())
        except NameError:
            pass

    if stderr:
        return stderr.decode()


def update_sys_path(env_var, postfix=""):
    """
    Update sys.path based on loaded module.

    :param env_var: Environment variable to be modified
    :type env_var: str
    :param postfix: Python environment's prefix
    :type postfix: str
    :return: Decorator function
    :rtype: callable
    """
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


def print_output_decorator(function):
    """
    Returns a wrapper that captures output, if produced and prints it

    :param function: Callable function
    :type paths: callable
    :return: Wrapper function
    :rtype: callable
    """
    @wraps(function)
    def wrapper(*args, **kargs):
        output = function(*args, **kargs)
        if output is not None:
            print(output)
    return wrapper


class ModuleAPI(object):
    """
    A class used to expose environment module (lmod or tmod) commands.

    ...

    Attributes
    ----------
    avail_cache : list
        cache of avail output
    list_cache : list
        cache of list output
    savelist_cache : list
        cache of save list
    show_cache : dict
        cache of module show output truncated to show_cache_capacity
    show_cache_capacity : int
        number of items to store in module show cache
    """
    def __init__(self, show_cache_capacity=128):
        self.avail_cache = None
        self.list_cache = None
        self.savelist_cache = None
        self.show_cache = OrderedDict()
        self.show_cache_capacity = show_cache_capacity

    def invalidate_module_caches(self):
        """Invalidate all caches."""
        self.avail_cache = None
        self.list_cache = None
        self.show_cache = OrderedDict()

    async def system(self):
        """
        Method to return module system type (lmod or tmod).

        :return: Type of module system found
        :rtype: str
        """
        return MODULE_SYSTEM

    async def avail(self, *args):
        """
        Method to get module avail output.

        :return: List of available modules
        :rtype: list
        """
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
        """
        Method to get module list output.

        :return: List of loaded modules
        :rtype: list
        """
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
        """
        Method to get generate python code for freezing currently active
        modules.

        :return: Python code to load the currently active modules
        :rtype: str
        """
        modules = await self.list(include_hidden=False)
        return "\n".join(
            [
                "import module",
                "await module.purge(force=True)",
                "await module.load({})".format(str(modules)[1:-1]),
            ]
        )

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def load(self, *modules):
        """
        Method to load given module(s).

        :param modules: List of modules to be loaded
        :type modules: list
        :return: Stderr if command failed
        :rtype: str
        """
        output = await module("load", *modules)
        self.invalidate_module_caches()
        return output

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def reset(self):
        """
        Method to reset to default module(s) set in LMOD_SYSTEM_DEFAULT_MODULES.
        Command sepecific for lmod systems

        :return: Stderr if command failed
        :rtype: str
        """
        if await self.module_system() == 'tmod':
            return 'subcommand reset does not exist in environment modules (tmod)'
        output = await module("reset")
        self.invalidate_module_caches()
        return output

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def restore(self, name):
        """
        Method to restore to given file or collection.

        :param name: Name of collection
        :type name: str
        :return: Stderr if command failed
        :rtype: str
        """
        output = await module("restore", name)
        self.invalidate_module_caches()
        return output

    async def save(self, name):
        """
        Method to save currently loaded modules to a collection.

        :param name: Name of collection
        :type name: str
        :return: Stderr if command failed
        :rtype: str
        """
        output = await module("save", name)
        self.savelist_cache = None
        return output

    async def savelist(self):
        """
        Method to list all saved collections.

        :param name: Name of collection
        :type name: str
        :return: Stderr if command failed
        :rtype: str
        """
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
        """
        Method to unload module(s).

        :param modules: List of modules to unload
        :type modules: list
        :return: Stderr if command failed
        :rtype: str
        """
        output = await module("unload", *modules)
        self.invalidate_module_caches()
        return output

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def purge(self, force=False):
        """
        Method to purge all module(s).

        :param force: Purge forcibly (default: False)
        :type name: boolean
        :return: Stderr if command failed
        :rtype: str
        """
        if force:
            args = ("--force",)
        else:
            args = ()
        output = await module("purge", *args)
        self.invalidate_module_caches()
        return output

    async def show(self, name):
        """
        Method to show a given module.

        :param name: Name of the module
        :type name: str
        :return: Module file content
        :rtype: str
        """
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
        """
        Method to use a given path(s) to look for modules.

        :param paths: List of paths to add to MODULEPATH
        :type paths: list
        :param append: Whether to append to existing MODULEPATH (Default: False)
        :type append: boolean
        :return: Stderr if command failed
        :rtype: str
        """
        args = paths
        if append:
            args = '-a', *args
        output = await module("use", *args)
        self.invalidate_module_caches()
        return output

    @update_sys_path("PYTHONPATH")
    @update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
    async def unuse(self, *paths):
        """
        Method to use a remove path(s) to look for modules.

        :param paths: List of paths to remove from MODULEPATH
        :type paths: list
        :return: Stderr if command failed
        :rtype: str
        """
        output = await module("unuse", *paths)
        self.invalidate_module_caches()
        return output


_module = ModuleAPI()

system = _module.system
avail = _module.avail
list = _module.list
freeze = _module.freeze
load = print_output_decorator(_module.load)
reset = print_output_decorator(_module.reset)
restore = print_output_decorator(_module.restore)
save = print_output_decorator(_module.save)
savelist = _module.savelist
unload = print_output_decorator(_module.unload)
purge = print_output_decorator(_module.purge)
show = _module.show
use = print_output_decorator(_module.use)
unuse = print_output_decorator(_module.unuse)
