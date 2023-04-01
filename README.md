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
