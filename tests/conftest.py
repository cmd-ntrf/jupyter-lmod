"""Define fixtures that will be used in tests"""

import os
import pytest

import module


pytest_plugins = ["pytest_jupyter.jupyter_server"]


@pytest.fixture
def jp_server_config(jp_server_config, jp_root_dir):
    return {
        "ServerApp": {"jpserver_extensions": {"jupyterlmod": True}},
    }


@pytest.fixture
def mod_avail():
    """Fixture to mod avail"""
    return ([f"module{i}/1.0.0" for i in range(20)] +
    [f"module{i}/2.0.0" for i in range(20)] +
    [f".module{i}/3.0.0" for i in range(5)])


@pytest.fixture
def mod_load():
    """Fixture to mod load"""
    return [f"module{i}/1.0.0" for i in range(3)] + [f".module{i}/3.0.0" for i in range(5)]


@pytest.fixture
def mod_list_visible(mod_load):
    """Fixture to mod load"""
    return [m for m in mod_load if not module.MODULE_HIDDEN_REGEX.match(m)]


@pytest.fixture
def mod_savelist():
    """Fixture to mod load"""
    return ['default', 'savelist1', 'savelist2']


@pytest.fixture
def mod_mlpath():
    """Fixture to mod module path"""
    return {
        'default': '/default/path/to/modulefiles',
        'new': '/new/path/to/modulefiles'
    }


@pytest.fixture()
def mocked_mod_avail(mocker, mod_avail):
    """Mock to list all dummy modules"""
    modules_header = "/path/to/module/files:"
    modules = '\n'.join(mod_avail)
    mocker.patch("module.module", return_value=f"{modules_header}\n{modules}")
    print(module.module)


@pytest.fixture()
def mocked_mod_list(mocker, mod_load):
    """Mock to list a loaded dummy modules"""
    stderr = """Currently Loaded Modulefiles:
{modules}""".format(modules='\n'.join(mod_load))
    mocker.patch("module.module", return_value=stderr)


@pytest.fixture()
def mocked_mod_load(mocker, monkeypatch, mod_load):
    """Mock to load a dummy module"""
    env = {
        'PATH': f"{':'.join([f'/path/to/{m}/bin' for m in mod_load]+['/rest/of/path'])}",
        'PKG_CONFIG_PATH': f"{':'.join([f'/path/to/{m}/lib/pkgconfig' for m in mod_load])}",
        'MANPATH':  f"{':'.join([f'/path/to/{m}/share/man' for m in mod_load])}",
        'LD_LIBRARY_PATH': f"{':'.join([f'/path/to/{m}/lib' for m in mod_load])}",
    }
    for k, v in env.items():
        monkeypatch.setenv(k, v)
    stderr = """Loaded modules:
{modules}""".format(modules='\n'.join(mod_load))
    mocker.patch("module.module", return_value=stderr)


@pytest.fixture()
def mocked_mod_save(mocker, monkeypatch, tmpdir_factory, mod_load):
    """Mock to save a list of loaded dummy modules"""
    mocked_modules_cfg = os.path.join(
        tmpdir_factory.mktemp(".module"), "default"
    )
    with open(mocked_modules_cfg, 'w') as f:
        f.write("""#%Modulex.y
module use --append /path/to/module/files
{module_files}
""".format(module_files='\n'.join(mod_load)))
    monkeypatch.setenv('HOME', os.path.dirname(
        os.path.dirname(mocked_modules_cfg))
    )
    mocker.patch("module.module", return_value=None)


@pytest.fixture()
def mocked_mod_savelist(mocker, mod_savelist):
    """Mock to show saved collection of modules"""
    stderr = """Named collection list:
{save_list}""".format(save_list='\n'.join(mod_savelist))
    mocker.patch("module.module", return_value=stderr)


@pytest.fixture()
def mocked_tmod_show(mocker, mod_load):
    """Mock to show a loaded dummy modules"""
    stderr = f"""-------------------------------------------------------------------
/path/to/modulefiles/{mod_load[0]}:

module-whatis   {{Dummy module}}
prepend-path    PATH /path/to/{mod_load[0]}/bin
prepend-path    MANPATH /path/to/{mod_load[0]}/share/man
prepend-path    PKG_CONFIG_PATH /path/to/{mod_load[0]}/lib/pkgconfig
prepend-path    LD_LIBRARY_PATH /path/to/{mod_load[0]}/lib
-------------------------------------------------------------------
"""
    mocker.patch("module.module", return_value=stderr)


@pytest.fixture()
def mocked_lmod_show(mocker, mod_load):
    """Mock to show a loaded dummy modules"""
    # Test for different module than the one used in tmod test. Else it module
    # will fetch from cache and it will fail the assertion
    stderr = f"""--------------------------------------------------------------------------------------
   /path/to/modulefiles/{mod_load[1]}:
--------------------------------------------------------------------------------------
whatis("Dummy module")
prepend_path("LD_LIBRARY_PATH","/path/to/{mod_load[1]}/lib")
prepend_path("PATH","/path/to/{mod_load[1]}/bin")
prepend_path("PKG_CONFIG_PATH","/path/to/{mod_load[1]}/lib/pkgconfig")
prepend_path("MANPATH","/path/to/{mod_load[1]}/share/man")
help([[Module help
]])
"""
    mocker.patch("module.module", return_value=stderr)


@pytest.fixture()
def mocked_mod_unload(mocker, monkeypatch, mocked_mod_load, mod_load):
    """Fixture to unload a dummy module"""
    monkeypatch.setenv('PATH', '/rest/of/path')
    monkeypatch.delenv('PKG_CONFIG_PATH')
    monkeypatch.delenv('MANPATH')
    monkeypatch.delenv('LD_LIBRARY_PATH')
    stderr = f"""Unloading {mod_load[0]}"""
    mocker.patch("module.module", return_value=stderr)


@pytest.fixture()
def mocked_mod_use(mocker, monkeypatch, mod_mlpath):
    """Fixture to use a dummy modulepath"""
    monkeypatch.setenv('MODULEPATH', mod_mlpath['new'])
    mocker.patch("module.module", return_value=None)


@pytest.fixture()
def mocked_mod_unuse(mocker, monkeypatch, mod_mlpath):
    """Fixture to unuse a dummy modulepath"""
    monkeypatch.setenv('MODULEPATH', mod_mlpath['default'])
    mocker.patch("module.module", return_value=None)
