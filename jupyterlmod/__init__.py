import os
import sys
import json
from jupyter_server.utils import url_path_join as ujoin
from pathlib import Path

from .config import Module as ModuleConfig
from .handler import default_handlers, PinsHandler, ModuleSystemLogoHandler

from module import MODULE_SYSTEM

HERE = Path(__file__).parent.resolve()

with (HERE / "labextension" / "package.json").open() as fid:
    data = json.load(fid)

def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": data["name"]
    }]


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
    nbapp.log.info("Loading lmod/tmod extension")
    module_config = ModuleConfig(parent=nbapp)
    launcher_pins = module_config.launcher_pins

    # As of now (31/march/2023) the extension is not working on jupyter
    # notebook using jupyter_server>2. See https://github.com/jupyter-server/jupyter_server/pull/1221
    # The extension has been tested on jupyter_server<2 and it is working
    # as expected
    web_app = nbapp.web_app
    base_url = web_app.settings["base_url"]
    for path, class_ in default_handlers:
        web_app.add_handlers(".*$", [(ujoin(base_url, path), class_)])

    web_app.add_handlers(".*$", [
        (ujoin(base_url, 'module/launcher-pins'), PinsHandler, {'launcher_pins': launcher_pins}),
    ])

    logo_path = os.path.join(
        sys.prefix, 'share', 'jupyter', 'nbextensions', 'jupyterlmod', 'logos',
        f'{MODULE_SYSTEM}.png'
    )
    web_app.add_handlers(".*$", [
        (ujoin(base_url, 'module/logo'), ModuleSystemLogoHandler, {'path': logo_path}),
    ])

# For backward compatibility
load_jupyter_server_extension = _load_jupyter_server_extension
_jupyter_server_extension_paths = _jupyter_server_extension_points
