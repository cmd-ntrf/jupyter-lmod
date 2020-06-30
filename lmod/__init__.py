import asyncio
import os
import sys

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


async def avail(*args):
    string = await module("avail", *args)
    modules = []
    for entry in string.split():
        if not (entry.startswith("/") or entry.endswith("/") or "@" in entry):
            modules.append(entry)
    modules.sort(key=lambda v: v.split("/")[0])
    return modules


async def list(hide_hidden=False):
    string = await module("list")
    string = string.strip()
    if string != "No modules loaded":
        modules = string.split()
        if hide_hidden:
            modules = [m for m in modules if m.rsplit("/", 1)[-1][0] != "."]
        return modules
    return []


async def freeze():
    modules = await list(hide_hidden=True)
    return "\n".join(
        [
            "import lmod",
            "await lmod.purge(force=True)",
            "await lmod.load({})".format(str(modules)[1:-1]),
        ]
    )


@update_sys_path("PYTHONPATH")
@update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
async def load(*args):
    output = await module("load", *args)
    if output:
        print(output)


@update_sys_path("PYTHONPATH")
@update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
async def reset():
    output = await module("reset")
    if output:
        print(output)


@update_sys_path("PYTHONPATH")
@update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
async def restore(*args):
    output = await module("restore", *args)
    if output:
        print(output)


async def savelist():
    string = await module("savelist")
    return string.split()


@update_sys_path("PYTHONPATH")
@update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
async def unload(*args):
    output = await module("unload", *args)
    if output:
        print(output)


@update_sys_path("PYTHONPATH")
@update_sys_path("EBPYTHONPREFIXES", SITE_POSTFIX)
async def purge(force=False):
    if force:
        args = ("--force",)
    else:
        args = ()
    output = await module("purge", *args)
    if output:
        print(output)

show = partial(module, "show")
save = partial(module, "save")

