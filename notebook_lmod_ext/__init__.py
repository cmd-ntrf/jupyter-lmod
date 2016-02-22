import os
import re

from collections import OrderedDict
from subprocess import Popen, PIPE

from notebook.utils import url_path_join as ujoin
from notebook.base.handlers import IPythonHandler

from jinja2 import Template
import tornado.ioloop
import tornado.web

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

def module(command, arguments=""):
    result = Popen('$LMOD_CMD python --terse {} {}'.format(command,
                                                           arguments),
                   shell=True,
                   stdout=PIPE,
                   stderr=PIPE,
                   bufsize=-1)
    if command == 'load' or command == 'unload':
        exec(result.stdout.read())

    return result.stderr.read().decode()

def module_avail():
    string = module('avail')
    list_ = string.split()
    locations = OrderedDict()
    cur_location = None
    for i, entry in enumerate(list_):
        if entry.startswith('/'):
            if entry.startswith('/software6/modulefiles'):
                entry = os.path.relpath(entry, '/software6/modulefiles')
            cur_location = entry
            locations[cur_location] = []
        elif (re.match("[A-Za-z\/]*", entry) and
              i != (len(list_) - 1) and
              list_[i+1].startswith(entry)):
            continue
        else:
            locations[cur_location].append(entry)
    return locations

def module_list():
    return set(module('list').split())

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

        module('load', " ".join(to_load))
        module('unload', " ".join(to_unload))

        self.module_list = module_list()
        self.write(self.template.render(moduleavail=module_avail(),
                                        modulelist=self.module_list))

def load_jupyter_server_extension(app):
    """
    Called when the extension is loaded.

    Args:
        nb_server_app (NotebookWebApplication): handle to the Notebook webserver instance.
    """
    app.log.info("Loading lmod extension")
    web_app = nb_server_app.web_app
    host_pattern = '.*$'
    route_pattern = url_path_join(web_app.settings['base_url'], '/lmod')
    web_app.add_handlers(host_pattern, [(route_pattern, LmodHandler)])


if __name__ == "__main__":
    app = tornado.web.Application([ (r"/", LmodHandler), ])
    app.listen(12345)
    tornado.ioloop.IOLoop.current().start()
