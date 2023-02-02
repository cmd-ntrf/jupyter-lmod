from jupyter_server.utils import url_path_join as ujoin

from .config import Lmod as LmodConfig
from .handler import default_handlers, PinsHandler


def _jupyter_server_extension_points():
    return [{"module": "jupyterlmod"}]


# Jupyter Extension points
def _jupyter_nbextension_paths():
    return [
        dict(
            section="tree", src="static", dest="jupyterlmod", require="jupyterlmod/main"
        )
    ]


def _load_jupyter_server_extension(nbapp):
    """
    Called when the extension is loaded.

    Args:
        nbapp : handle to the Notebook webserver instance.
    """
    nbapp.log.info("Loading lmod extension")
    lmod_config = LmodConfig(parent=nbapp)
    launcher_pins = lmod_config.launcher_pins

    web_app = nbapp.web_app
    base_url = web_app.settings["base_url"]
    for path, class_ in default_handlers:
        web_app.add_handlers(".*$", [(ujoin(base_url, path), class_)])

    web_app.add_handlers(".*$", [
        (ujoin(base_url, 'lmod/launcher-pins'), PinsHandler, {'launcher_pins': launcher_pins}),
    ])

# For backward compatibility
load_jupyter_server_extension = _load_jupyter_server_extension
_jupyter_server_extension_paths = _jupyter_server_extension_points
