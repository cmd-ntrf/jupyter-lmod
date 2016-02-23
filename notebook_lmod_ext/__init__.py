import json

import tornado.ioloop
import tornado.web
import lmod

from notebook.utils import url_path_join
from notebook.base.handlers import IPythonHandler

from jinja2 import Template

modules_template = """
<html><body><form method="POST">
{% for loc, modules in moduleavail.items() %}
  <h2>{{ loc }}</h2>
  <table>
      <tr>
      {% for module in modules %}
      <td><input type="checkbox" name="module" value="{{ module }}" {% if module in modulelist %} checked {% endif %}> {{ module }} </td>
      {% if loop.index % 4 == 0 %}
            </tr><tr>
      {% endif %}
      {% endfor %}
      </tr>
  </table>
{% endfor %}
<input type="submit">
</form></body></html>
"""

class LmodActionHandler(IPythonHandler):
    @tornado.web.authenticated
    def get(self, action):
        if action == 'avail':
            self.finish(json.dumps(lmod.module_avail()))
        elif action == 'list':
            self.finish(json.dumps(lmod.module_list()))

    @tornado.web.authenticated
    def post(self, action):
        if action in ('load', 'unload'):
            module = self.get_argument('module', default=None)
            if module:
                lmod.module(action, module)
                self.finish(json.dumps('SUCCESS'))

class LmodHandler(IPythonHandler):
    template = Template(modules_template)

    def initialize(self):
        self.module_list = module_list()

    @tornado.web.authenticated
    def get(self):
        self.write(self.template.render(moduleavail=module_avail(),
                                        modulelist=self.module_list))

    @tornado.web.authenticated
    def post(self):
        checked_modules = self.request.arguments['module']
        new_modulelist = set(map(bytes.decode, checked_modules))

        to_load = new_modulelist - self.module_list
        to_unload = self.module_list - new_modulelist

        lmod.module('load', " ".join(to_load))
        lmod.module('unload', " ".join(to_unload))

        self.module_list = set(lmod.module_list())
        self.write(self.template.render(moduleavail=module_avail(),
                                        modulelist=self.module_list))


#-----------------------------------------------------------------------------
# URL to handler mappings
#-----------------------------------------------------------------------------
_lmod_action_regex = r"(?P<action>load|unload|avail|list)"

default_handlers = [
    (r"/lmod", LmodHandler),
    (r"/lmod/%s" % (_lmod_action_regex), LmodActionHandler),
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
    app = tornado.web.Application([ (r"/", LmodHandler), ])
    app.listen(12345)
    tornado.ioloop.IOLoop.current().start()
