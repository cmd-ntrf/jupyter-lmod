"""List of handlers to register"""

import json
import os

import module

from functools import wraps
from glob import glob

from tornado import web
from jupyter_core.paths import jupyter_path

from jupyter_server.base.handlers import JupyterHandler


def jupyter_path_decorator(func):
    @wraps(func)
    async def wrapper(self, *args, **kwargs):
        jpath_old = os.environ.get("JUPYTER_PATH")
        await func(self, *args, **kwargs)
        if jpath_old != os.environ.get("JUPYTER_PATH"):
            self.kernel_spec_manager.kernel_dirs = jupyter_path("kernels")
    return wrapper


MODULE = module.ModuleAPI()


class ModuleSystemLogoHandler(JupyterHandler, web.StaticFileHandler):
    """Handler to get current module system logo"""
    @web.authenticated
    def get(self):
        return super().get('')

    @classmethod
    def get_absolute_path(cls, root, path):
        """We only serve one file, ignore relative path"""
        return os.path.abspath(root)


class ModuleSystem(JupyterHandler):
    """Handler to get current module system name"""
    @web.authenticated
    async def get(self):
        result = await MODULE.system()
        self.finish(json.dumps(result))


class Module(JupyterHandler):
    """Handler to load, unload and list modules"""
    @web.authenticated
    async def get(self):
        lang = self.get_query_argument(name="lang", default=None)
        all = self.get_query_argument(name="all", default=None)
        if lang is None:
            all = all is not None and all == "true"
            result = await MODULE.list(include_hidden=all)
        elif lang == "python":
            result = await MODULE.freeze()
        else:
            raise web.HTTPError(400, u'Unknown value for lang argument')
        self.finish(json.dumps(result))

    @web.authenticated
    @jupyter_path_decorator
    async def post(self):
        modules = self.get_json_body().get('modules')
        if not modules:
            raise web.HTTPError(400, u'modules missing from body')
        elif not isinstance(modules, list):
            raise web.HTTPError(400, u'modules argument needs to be a list')
        result = await MODULE.load(*modules)
        self.finish(json.dumps(result))

    @web.authenticated
    @jupyter_path_decorator
    async def delete(self):
        modules = self.get_json_body().get('modules')
        if not modules:
            raise web.HTTPError(400, u'modules missing from body')
        elif not isinstance(modules, list):
            raise web.HTTPError(400, u'modules argument needs to be a list')
        result = await MODULE.unload(*modules)
        self.finish(json.dumps(result))


class AvailModules(JupyterHandler):
    """Handler to get available modules"""
    @web.authenticated
    async def get(self):
        result = await MODULE.avail()
        self.finish(json.dumps(result))


class ShowModule(JupyterHandler):
    """Handler to show module"""
    @web.authenticated
    async def get(self, module=None):
        result = await MODULE.show(module)
        self.finish(json.dumps(result))


class ModuleCollections(JupyterHandler):
    """Handler to get, create and update module collections"""
    @web.authenticated
    async def get(self):
        result = await MODULE.savelist()
        self.finish(json.dumps(result))

    @web.authenticated
    async def post(self):
        name = self.get_json_body().get('name')
        if not name:
            raise web.HTTPError(400, u'name argument missing')
        result = await MODULE.save(name)
        self.finish(json.dumps(result))

    @web.authenticated
    @jupyter_path_decorator
    async def patch(self):
        name = self.get_json_body().get('name')
        if not name:
            raise web.HTTPError(400, u'name argument missing')
        result = await MODULE.restore(name)
        self.finish(json.dumps(result))


class ModulePaths(JupyterHandler):
    """Handler to get, set and delete module paths"""
    @web.authenticated
    async def get(self):
        result = os.environ.get("MODULEPATH")
        if result is not None:
            result = result.split(":")
        else:
            result = []
        self.finish(json.dumps(result))

    @web.authenticated
    @jupyter_path_decorator
    async def post(self):
        paths = self.get_json_body().get('paths')
        append = self.get_json_body().get('append', False)
        if not paths:
            raise web.HTTPError(400, u'paths argument missing')
        result = await MODULE.use(*paths, append=append)
        self.finish(json.dumps(result))

    @web.authenticated
    @jupyter_path_decorator
    async def delete(self):
        paths = self.get_json_body().get('paths')
        if not paths:
            raise web.HTTPError(400, u'paths argument missing')
        result = await MODULE.unuse(*paths)
        self.finish(json.dumps(result))


class FoldersHandler(JupyterHandler):
    """Handler to get folders"""
    @web.authenticated
    async def get(self, path):
        result = glob(path + "*/")
        result = [path[:-1] for path in result]
        self.finish(json.dumps(result))


class PinsHandler(JupyterHandler):
    """Handler to get list of pinned apps"""
    def initialize(self, launcher_pins):
        self.launcher_pins = launcher_pins

    @web.authenticated
    async def get(self):
        self.write({'launcher_pins': self.launcher_pins})


default_handlers = [
    (r"/module/system", ModuleSystem),
    (r"/module", Module),
    (r"/module/modules", AvailModules),
    (r"/module/modules/(.*)", ShowModule),
    (r"/module/collections", ModuleCollections),
    (r"/module/paths", ModulePaths),
    (r"/module/folders/(.*)", FoldersHandler)
]
