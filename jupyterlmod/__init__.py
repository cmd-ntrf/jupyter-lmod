import json

import tornado.ioloop
import tornado.web
import lmod

from notebook.utils import url_path_join
from notebook.base.handlers import IPythonHandler

class LmodActionHandler(IPythonHandler):
    @tornado.web.authenticated
    def get(self, action):
        if action == 'avail':
            self.finish(json.dumps(lmod.module_avail()))
        elif action == 'list':
            self.finish(json.dumps(lmod.module_list()))
        elif action == 'savelist':
            self.finish(json.dumps(lmod.module_savelist()))
        elif action == 'show':
            modules = self.get_arguments("modules")
            self.finish(json.dumps(lmod.module('show', modules)))

    @tornado.web.authenticated
    def post(self, action):
        if action in ('load', 'unload', 'restore', 'save'):
            modules = self.get_arguments('modules')
            if modules:
                lmod.module(action, modules)
                self.finish(json.dumps('SUCCESS'))

#-----------------------------------------------------------------------------
# URL to handler mappings
#-----------------------------------------------------------------------------
_lmod_action_regex = r"(?P<action>load|unload|avail|list|savelist|restore|save)"

default_handlers = [
    (r"/lmod/%s" % (_lmod_action_regex), LmodActionHandler),
    (r"/lmod/(?P<action>show).*", LmodActionHandler)
]

def load_jupyter_server_extension(nbapp):
    """
    Called when the extension is loaded.

    Args:
        nb_server_app (NotebookWebApplication): handle to the Notebook webserver instance.
    """
    nbapp.log.info("Loading lmod extension")
    web_app = nbapp.web_app
    host_pattern = '.*$'
    for handler in default_handlers:
        route_pattern = url_path_join(web_app.settings['base_url'], handler[0])
        web_app.add_handlers(host_pattern, [(route_pattern, handler[1])])

    # Load javascript extension
    nbapp.config_manager.update('tree', {"load_extensions": {"lmod": True}})

if __name__ == "__main__":
    app = tornado.web.Application([ (r"/", LmodActionHandler), ])
    app.listen(12345)
    tornado.ioloop.IOLoop.current().start()
