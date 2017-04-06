import json

import tornado.ioloop
import tornado.web
import lmod

from notebook.base.handlers import IPythonHandler

#-----------------------------------------------------------------------------
# URL to handler mappings
#-----------------------------------------------------------------------------
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

_lmod_action_regex = r"(?P<action>load|unload|avail|list|savelist|restore|save)"

default_handlers = [
    (r"/lmod/%s" % (_lmod_action_regex), LmodActionHandler),
    (r"/lmod/(?P<action>show).*", LmodActionHandler)
]

if __name__ == "__main__":
    app = tornado.web.Application([ (r"/", LmodActionHandler), ])
    app.listen(12345)
    tornado.ioloop.IOLoop.current().start()
