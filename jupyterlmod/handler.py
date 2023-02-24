import json
import os

import lmod

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

LMOD = lmod.API()

class Lmod(JupyterHandler):
    @web.authenticated
    async def get(self):
        lang = self.get_query_argument(name="lang", default=None)
        all = self.get_query_argument(name="all", default=None)
        if lang is None:
            all = all is not None and all == "true"
            result = await LMOD.list(include_hidden=all)
        elif lang == "python":
            result = await LMOD.freeze()
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
        result = await LMOD.load(*modules)
        self.finish(json.dumps(result))

    @web.authenticated
    @jupyter_path_decorator
    async def delete(self):
        modules = self.get_json_body().get('modules')
        if not modules:
            raise web.HTTPError(400, u'modules missing from body')
        elif not isinstance(modules, list):
            raise web.HTTPError(400, u'modules argument needs to be a list')
        result = await LMOD.unload(*modules)
        self.finish(json.dumps(result))

class LmodModules(JupyterHandler):
    @web.authenticated
    async def get(self):
        result = await LMOD.avail()
        self.finish(json.dumps(result))

class LmodModule(JupyterHandler):
    @web.authenticated
    async def get(self, module=None):
        result = await LMOD.show(module)
        self.finish(json.dumps(result))

class LmodCollections(JupyterHandler):
    @web.authenticated
    async def get(self):
        result = await LMOD.savelist()
        self.finish(json.dumps(result))

    @web.authenticated
    async def post(self):
        name = self.get_json_body().get('name')
        if not name:
            raise web.HTTPError(400, u'name argument missing')
        result = await LMOD.save(name)
        self.finish(json.dumps(result))

    @web.authenticated
    @jupyter_path_decorator
    async def patch(self):
        name = self.get_json_body().get('name')
        if not name:
            raise web.HTTPError(400, u'name argument missing')
        result = await LMOD.restore(name)
        self.finish(json.dumps(result))

class LmodPaths(JupyterHandler):
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
        result = await LMOD.use(*paths, append=append)
        self.finish(json.dumps(result))

    @web.authenticated
    @jupyter_path_decorator
    async def delete(self):
        paths = self.get_json_body().get('paths')
        if not paths:
            raise web.HTTPError(400, u'paths argument missing')
        result = await LMOD.unuse(*paths)
        self.finish(json.dumps(result))

class FoldersHandler(JupyterHandler):
    @web.authenticated
    async def get(self, path):
        result = glob(path + "*/")
        result = [path[:-1] for path in result]
        self.finish(json.dumps(result))

class PinsHandler(JupyterHandler):
    def initialize(self, launcher_pins):
        self.launcher_pins = launcher_pins

    @web.authenticated
    async def get(self):
        self.write({'launcher_pins': self.launcher_pins})

default_handlers = [
    (r"/lmod", Lmod),
    (r"/lmod/modules", LmodModules),
    (r"/lmod/modules/(.*)", LmodModule),
    (r"/lmod/collections", LmodCollections),
    (r"/lmod/paths", LmodPaths),
    (r"/lmod/folders/(.*)", FoldersHandler)
]
