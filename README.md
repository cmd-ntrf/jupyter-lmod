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

### jupyterlab-server-proxy

To only display a server proxy launcher when its corresponding module is loaded, make sure to
disable the launcher entry in jupyter-server-proxy configuration. Refer to
[Server Process options docs](https://jupyter-server-proxy.readthedocs.io/en/latest/server-process.html)
for more information.

This is an example of a `jupyter_notebook_config.json` file snippet where RStudio and Code Server
launchers are displayed only when `rstudio` or `code-server` module are loaded.

```
    {
        "ServerProxy": {
            "servers": {
                "code-server": {
                    "command": [
                        "code-server",
                        "--no-auth",
                        "--disable-telemetry",
                        "--allow-http",
                        "--port={port}"
                    ],
                    "timeout": 20,
                    "launcher_entry": {
                        "title": "VS Code",
                        "enabled" : false
                    },
                },
                "rstudio": {
                    "command": [
                        "rserver",
                        "--www-port={port}",
                        "--www-frame-origin=same",
                        "--www-address=127.0.0.1"
                    ],
                    "timeout": 20,
                    "launcher_entry": {
                            "title": "RStudio",
                            "enabled" : false
                    },
                }
            }
        }
    }
```

## demo

![Jupyter notebook demo](http://i.imgur.com/IP9uUJp.gif)

![JupyterLab demo](https://i.imgur.com/1HDH7iN.gif)
