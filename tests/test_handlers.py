"""Tests for module handlers"""

import os
import json
import pytest

import module


async def test_mod_system(jp_fetch, mocker):
    """Test /module/system handler that show module type"""
    mocker.patch.object(module, "MODULE_SYSTEM", new='lmod')
    response = await jp_fetch(
        "/module", "system", method="GET"
    )
    assert response.code == 200
    assert json.loads(response.body) == 'lmod'


async def test_mod_avail(jp_fetch, mocked_mod_avail, mod_avail):
    """Test /module/modules handler that shows available modules"""
    response = await jp_fetch(
        "/module", "modules", method="GET"
    )
    assert response.code == 200
    assert set(json.loads(response.body)) == set(mod_avail)


async def test_mod_load(jp_fetch, mocked_mod_load, mod_load):
    """Test /module handler to load  modules"""
    payload = json.dumps({'modules': mod_load})
    response = await jp_fetch(
        "/module", body=payload, method="POST"
    )
    expected = """Loaded modules:
{modules}""".format(modules='\n'.join(mod_load))
    assert response.code == 200
    assert expected == json.loads(response.body)


async def test_mod_unload(jp_fetch, mod_load):
    """Test /module handler to unload modules"""
    payload = json.dumps({'modules': mod_load})
    response = await jp_fetch(
        "/module", body=payload, method="DELETE",
        allow_nonstandard_methods=True
    )
    assert response.code == 200


async def test_mod_show(jp_fetch, mocked_tmod_show, mod_load):
    """Test /module/modules handler to show modules"""
    response = await jp_fetch(
        "/module", "modules", mod_load[0], method="GET"
    )
    assert response.code == 200
    expected = [
        "prepend-path    PATH", "prepend-path    PKG_CONFIG_PATH",
        "prepend-path    MANPATH", "prepend-path    LD_LIBRARY_PATH"
    ]
    for s in expected:
        assert s in json.loads(response.body)


async def test_mod_get_collection(jp_fetch, mocked_mod_savelist, mod_savelist):
    """Test /module/collections handler that shows collections"""
    response = await jp_fetch(
        "/module", "collections", method="GET"
    )
    assert response.code == 200
    assert set(json.loads(response.body)) == set(mod_savelist)


async def test_mod_set_collection(jp_fetch, mocked_mod_save):
    """Test /module/collections handler that create collections"""
    payload = json.dumps({'name': 'test'})
    response = await jp_fetch(
        "/module", "collections", body=payload, method="POST"
    )
    assert response.code == 200


async def test_mod_get_paths(jp_fetch, mocked_mod_use, mod_mlpath):
    """Test /module/paths handler that shows modulepaths"""
    response = await jp_fetch(
        "/module", "paths", method="GET"
    )
    assert response.code == 200
    assert set(json.loads(response.body)) == set([mod_mlpath['new']])


async def test_mod_set_paths(jp_fetch, mocked_mod_use, mod_mlpath):
    """Test /module/paths handler that adds modulepaths"""
    payload = json.dumps({'paths': [mod_mlpath['new']]})
    response = await jp_fetch(
        "/module", "paths", body=payload, method="POST"
    )
    assert response.code == 200
    assert os.environ['MODULEPATH'] == mod_mlpath['new']


async def test_mod_del_paths(jp_fetch, mocked_mod_unuse, mod_mlpath):
    """Test /module/paths handler that deletes modulepaths"""
    payload = json.dumps({'paths': [mod_mlpath['new']]})
    response = await jp_fetch(
        "/module", "paths", body=payload, method="DELETE",
        allow_nonstandard_methods=True
    )
    assert response.code == 200
    assert os.environ['MODULEPATH'] == mod_mlpath['default']
