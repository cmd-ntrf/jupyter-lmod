"""Unit tests for module"""

import os
import shutil
import pytest

import module


@pytest.mark.parametrize("mod_system", ["lmod", "tmod"])
async def test_mod_system(mocker, mod_system):
    """Test module system"""
    mocker.patch.object(module, "MODULE_SYSTEM", new=mod_system)
    result = await module.system()
    assert result == mod_system


async def test_avail(mocked_mod_avail, mod_avail):
    """Test module avail command"""
    result = await module.avail()
    assert set(result) == set(mod_avail)


async def test_list(mocked_mod_list, mod_load, mod_list_visible):
    """Test module list command"""
    result = await module.list(include_hidden=True)
    assert set(result) == set(mod_load)
    result = await module.list(include_hidden=False)
    assert set(result) == set(mod_list_visible)


async def test_freeze(mocked_mod_list, mod_list_visible):
    """Test module freeze command"""
    result = await module.freeze()
    expected = "\n".join(
        [
            "import module",
            "await module.purge(force=True)",
            "await module.load({})".format(str(mod_list_visible)[1:-1]),
        ]
    )
    assert result == expected


async def test_load(mocked_mod_load, mod_load, capsys):
    """Test module load command"""
    _ = await module.load(*mod_load)
    captured = capsys.readouterr()
    expected = """Loaded modules:
{modules}""".format(modules='\n'.join(mod_load))
    assert captured.out.strip() == expected.strip()
    for m in mod_load:
        assert f'{m}/bin' in os.environ['PATH']
        assert f'{m}/lib/pkgconfig' in os.environ['PKG_CONFIG_PATH']
        assert f'{m}/share/man' in os.environ['MANPATH']
        assert f'{m}/lib' in os.environ['LD_LIBRARY_PATH']


async def test_reset(mocker, capsys):
    """Test module reset command"""
    mocker.patch.object(module, "MODULE_SYSTEM", new="tmod")
    _ = await module.reset()
    expected = "reset does not exist"
    captured = capsys.readouterr()
    assert expected in captured.out


async def test_save(mocked_mod_save):
    """Test module save command"""
    list_name = 'default'
    _ = await module.save(list_name)
    assert os.path.exists(
        os.path.join(os.environ['HOME'], '.module0', list_name)
    )


async def test_savelist(mocked_mod_savelist, mod_savelist):
    """Test module savelist command"""
    result = await module.savelist()
    assert set(result) == set(mod_savelist)


async def test_unload(mocked_mod_unload, mod_load):
    """Test module unload command"""
    result = await module.unload(*mod_load)
    assert os.environ['PATH'] == '/rest/of/path'
    assert 'PKG_CONFIG_PATH' not in os.environ.keys()
    assert 'MANPATH' not in os.environ.keys()
    assert 'LD_LIBRARY_PATH' not in os.environ.keys()


async def test_purge(mocked_mod_unload):
    """Test module purge command"""
    result = await module.purge()
    assert os.environ['PATH'] == '/rest/of/path'
    assert 'PKG_CONFIG_PATH' not in os.environ.keys()
    assert 'MANPATH' not in os.environ.keys()
    assert 'LD_LIBRARY_PATH' not in os.environ.keys()


async def test_tmod_show(mocked_tmod_show, mod_load):
    """Test module show command"""
    # Tmod
    result = await module.show(mod_load[0])
    expected = [
        "prepend-path    PATH", "prepend-path    PKG_CONFIG_PATH",
        "prepend-path    MANPATH", "prepend-path    LD_LIBRARY_PATH"
    ]
    for s in expected:
        assert s in result


async def test_lmod_show(mocked_lmod_show, mod_load):
    """Test module show command"""
    result = await module.show(mod_load[1])
    expected = [
        'prepend_path("LD_LIBRARY_PATH"', 'prepend_path("PATH"',
        'prepend_path("PKG_CONFIG_PATH"', 'prepend_path("MANPATH"'
    ]
    for s in expected:
        assert s in result


async def test_use(mocked_mod_use, mod_mlpath):
    """Test module use command"""
    _ = await module.use(mod_mlpath['new'])
    assert os.environ['MODULEPATH'] == mod_mlpath['new']


async def test_unuse(mocked_mod_unuse, mod_mlpath):
    """Test module unuse command"""
    _ = await module.unuse(mod_mlpath['new'])
    assert os.environ['MODULEPATH'] == mod_mlpath['default']
