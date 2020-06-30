import json
import os

import tornado.web
import lmod

from functools import partial
from jupyter_core.paths import jupyter_path
from notebook.base.handlers import IPythonHandler

ACTIONS = {
    "avail"    : lmod.avail,
    "list"     : partial(lmod.list, hide_hidden=True),
    "freeze"   : lmod.freeze,
    "show"     : lmod.show,
    "load"     : lmod.load,
    "unload"   : lmod.unload,
    "purge"    : lmod.purge,
    "savelist" : lmod.savelist,
    "save"     : lmod.save,
    "restore"  : lmod.restore,
    "reset"    : lmod.reset
}

class LmodActionHandler(IPythonHandler):
    @tornado.web.authenticated
    async def get(self, action):
        func = ACTIONS.get(action, None)
        if func:
            args = self.get_arguments("args")
            result = await func(*args)
            self.finish(json.dumps(result))

    @tornado.web.authenticated
    async def post(self, action):
        func = ACTIONS.get(action, None)
        if func:
            args = self.get_arguments('args')
            if args:
                jpath_old = os.environ.get('JUPYTER_PATH')
                await func(*args)
                # If JUPYTER_PATH has been modified by func
                # the kernel directory list is updated.
                if jpath_old != os.environ.get('JUPYTER_PATH'):
                    self.kernel_spec_manager.kernel_dirs = jupyter_path('kernels')
                self.finish(json.dumps('SUCCESS'))

_action_regex = r"/lmod/(?P<action>{})".format("|".join(ACTIONS.keys()))
default_handlers = [(_action_regex, LmodActionHandler)]

if __name__ == "__main__":
    import tornado.ioloop
    app = tornado.web.Application([ (r"/", LmodActionHandler), ])
    app.listen(12345)
    tornado.ioloop.IOLoop.current().start()
