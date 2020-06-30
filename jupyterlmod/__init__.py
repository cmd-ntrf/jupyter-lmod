from notebook.utils import url_path_join

from . import handler


def _jupyter_server_extension_paths():
    return [{"module": "jupyterlmod"}]


# Jupyter Extension points
def _jupyter_nbextension_paths():
    return [
        dict(
            section="tree", src="static", dest="jupyterlmod", require="jupyterlmod/main"
        )
    ]


def load_jupyter_server_extension(nbapp):
    """
    Called when the extension is loaded.

    Args:
        nbapp : handle to the Notebook webserver instance.
    """
    nbapp.log.info("Loading lmod extension")
    web_app = nbapp.web_app
    host_pattern = ".*$"
    for path, class_ in handler.default_handlers:
        route_pattern = url_path_join(web_app.settings["base_url"], path)
        web_app.add_handlers(host_pattern, [(route_pattern, class_)])
