from traitlets.config import Configurable
from traitlets import List

class Lmod(Configurable):
    launcher_pins = List().tag(config=True)
