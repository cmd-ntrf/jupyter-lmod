import json

import tornado.web
import lmod

from notebook.base.handlers import IPythonHandler

ACTIONS = {
    "avail"    : lmod.avail,
    "list"     : lmod.list,
    "show"     : lmod.show,
    "load"     : lmod.load,
    "unload"   : lmod.unload,
    "savelist" : lmod.savelist,
    "save"     : lmod.save,
    "restore"  : lmod.restore
}

class LmodActionHandler(IPythonHandler):
    @tornado.web.authenticated
    def get(self, action):
        func = ACTIONS.get(action, None)
        if func:
            args = self.get_arguments("args")
            result = func(*args)
            self.finish(json.dumps(result))

    @tornado.web.authenticated
    def post(self, action):
        func = ACTIONS.get(action, None)
        if func:
            args = self.get_arguments('args')
            if args:
                func(*args)
                self.finish(json.dumps('SUCCESS'))

_action_regex = r"/lmod/(?P<action>{})".format("|".join(ACTIONS.keys()))
default_handlers = [(_action_regex, LmodActionHandler)]

if __name__ == "__main__":
    import tornado.ioloop
    app = tornado.web.Application([ (r"/", LmodActionHandler), ])
    app.listen(12345)
    tornado.ioloop.IOLoop.current().start()
