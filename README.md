# Jupyter Lmod

Jupyter interactive notebook server extension that allows user
to interact with environment modules before launching kernels.
The extension use Lmod's Python interface to accomplish module
related task like loading, unloading, saving collection, etc.

## requirements

- [jupyter notebook](https://github.com/jupyter/notebook) >= 5.3
- [Lmod](https://github.com/TACC/Lmod) >= 6.0
- optional: [jupyter-server-proxy](https://github.com/jupyterhub/jupyter-server-proxy) >= 1.5.0
- optional: [jupyterlab-server-proxy](https://github.com/jupyterhub/jupyter-server-proxy) >= 2.1.0

If jupyter-server-proxy and jupyterlab-server-proxy are detected, jupyter-lmod will add the
proxy server launchers to JupyterLab UI when modules with matching names are loaded.

## setup

### install

```
pip install jupyterlmod
```

### jupyterlab

```
jupyter labextension install jupyterlab-lmod
```

### Disable jupyter-server-proxy notebook and lab extensions

To avoid having items in the launcher that cannot be launch because the binaries location are not in PATH,
jupyter-lmod hides items that do not have a corresponding loaded module. jupyter-server-proxy notebook and
lab extension always display the item. To avoid a situation where an item would be shown twice, we recommend
disabling jupyter-server-proxy notebook and lab extensions.

This can be done with the following command for notebook:
```
jupyter nbextension disable --py jupyter_server_proxy --sys-prefix
``` 

and with the following command for jupyterlab:
```
jupyter labextension disable @jupyterlab/server-proxy
```

## demo

![Jupyter notebook demo](https://i.imgur.com/pK1Q5gG.gif)

![JupyterLab demo](https://i.imgur.com/1HDH7iN.gif)
