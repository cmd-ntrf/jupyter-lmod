# Jupyter Lmod

Jupyter interactive notebook server extension that allows user
to interact with environment modules before launching kernels.
The extension use Lmod's Python interface to accomplish module
related task like loading, unloading, saving collection, etc.

## requirements

- [jupyter notebook](https://github.com/jupyter/notebook) >= 6.0
- [Lmod](https://github.com/TACC/Lmod) >= 6.0
- optional: [jupyterlab](https://github.com/jupyter/notebook) >= 3.0
- optional: [jupyter-server-proxy](https://github.com/jupyterhub/jupyter-server-proxy) >= 3.2.0
- optional: [jupyterlab-server-proxy](https://github.com/jupyterhub/jupyter-server-proxy) >= 3.2.0

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
    cd jupyterlab
    npm install
    npm run build
    # To install extension in jupyterlab in develop mode:
    npm run install:extension
    ```
