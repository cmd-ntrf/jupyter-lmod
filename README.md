# Jupyter Lmod/Tmod

Jupyter interactive notebook server extension that allows user
to interact with environment modules (Lmod or Tmod) before launching kernels.
The extension use environment module's Python interface to accomplish module
related task like loading, unloading, saving collection, etc.

## requirements

- [jupyter notebook](https://github.com/jupyter/notebook) >= 6.0
- [Lmod](https://github.com/TACC/Lmod) >= 6.0 or [Tmod](https://modules.readthedocs.io/en/latest/) >= 5.0
- optional: [jupyterlab](https://github.com/jupyter/notebook) >= 3.0
- optional: [jupyter-server-proxy](https://github.com/jupyterhub/jupyter-server-proxy) >= 3.2.0
- optional: [jupyterlab-server-proxy](https://github.com/jupyterhub/jupyter-server-proxy) >= 3.2.0

**Note** that the extension supports Tmod < 5.0 too. However, if `MODULES_RUN_QUARANTINE` is not empty on the platform, module's Python API does
not have correct behaviour. On default installations, `MODULES_RUN_QUARANTINE=LD_LIBRARY_PATH` is used. If `LD_LIBRARY_PATH` is not
empty before loading a module, the existant paths in `LD_LIBRARY_PATH` is lost
after loading the module. More discussion can be found [here](https://sourceforge.net/p/modules/mailman/message/36113970/).

If jupyter-server-proxy and jupyterlab-server-proxy are detected, jupyter-lmod will add the
proxy server launchers to JupyterLab UI when modules with matching names are loaded.

## setup

### install

```
pip install jupyterlmod
```

### Disable jupyter-server-proxy notebook and lab extensions

To avoid having items in the launcher that cannot be launched because the binaries location are not in PATH,
jupyter-lmod hides launcher items that do not have a corresponding loaded module.
jupyter-server-proxy notebook and lab extension always display the launcher item.
To avoid a situation where an item would be shown twice, we recommend disabling jupyter-server-proxy
notebook and lab extensions.

This can be done with the following command for notebook:
```
jupyter nbextension disable --py jupyter_server_proxy --sys-prefix
```

and with the following commands for jupyterlab:
```
jupyter labextension disable @jupyterlab/server-proxy
jupyter labextension disable jupyterlab-server-proxy
```

### Pinning launcher items

If server proxies do not have a corresponding modules, or you wish to have their launcher items
displayed regardless of the loaded modules, you can define a list of items that will be pinned in
the Jupyter notebook configuration file, like this:
```
c.Lmod.launcher_pins = ['Desktop', 'RStudio']
```
or
```
c.Tmod.launcher_pins = ['Desktop', 'RStudio']
```
based on your module system.

### Mapping launcher items to modules

If the name of the server proxies do not match a corresponding module, or you wish to have multiple
launchers for a single module, you can define a map of server proxies to module names in the
Jupyter notebook configuration file, like this:
```
c.Lmod.launcher_module_map = {'RStudio': ['rstudio-server'], 'paraview': ['paraview-client', 'paraview/5.13']}
```
or
```
c.Tmod.launcher_module_map = {'RStudio': ['rstudio-server'], 'paraview': ['paraview-client', 'paraview/5.13']}
```
based on your module system.

### JupyterHub and loading module that add kernels

If you have modules that modify `JUPYTER_PATH` and you access Jupyter through JupyterHub,
make sure that `c.Spawner.disable_user_config = False`.

When `disable_user_config = True`, JupyterHub single-user server monkey-patches the
`jupyter_core.jupyter_path` function to remove any path related to home. In order to do
that, they retrieve the value of `JUPYTER_PATH`, remove any paths related to home, then
keep it in a global variable. The `jupyter_path` function is then patched to only return
versions of the global variable, making the function no longer affected by changer to
`JUPYTER_PATH`.

The JupyterHub monkey-patching of `jupyter_path` can be read
[here](https://github.com/jupyterhub/jupyterhub/blob/01a43f41f8b1554f2de659104284f6345d76636d/jupyterhub/singleuser/_disable_user_config.py#L57).

## demo

![Jupyter notebook demo](https://i.imgur.com/pK1Q5gG.gif)

![JupyterLab demo](https://i.imgur.com/1HDH7iN.gif)


## develop

### requirements

- pip >= 23
- [build](https://pypi.org/project/build/)
- nodejs >= 18.x

### build

- wheel and tarball:
    ```shell
    pyproject-build
    ```
- labextension
    ```shell
    npm install
    npm run build
    # To install extension in jupyterlab in develop mode:
    npm run install:extension
    ```
