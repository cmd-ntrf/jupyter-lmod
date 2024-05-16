from traitlets.config import Configurable
from traitlets import List, Unicode


class Lmod(Configurable):
    """Configurable for Lmod"""
    launcher_pins = List(
        trait=Unicode(),
        help="""
        Launcher items to be displayed regardless of the loaded modules
        """
    ).tag(config=True)


class Tmod(Configurable):
    """Configurable for Tmod"""
    launcher_pins = List(
        trait=Unicode(),
        help="""
        Launcher items to be displayed regardless of the loaded modules
        """
    ).tag(config=True)


class Module(Lmod, Tmod):
    """Derived class which will be used during configuration"""
    pass
