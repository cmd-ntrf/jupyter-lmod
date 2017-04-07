# Jupyter Lmod

Jupyter interactive notebook server extension that allows user 
to interact with environment modules before launching kernels.

The extension use Lmod's Python interface to accomplish module
related task like loading, unloading, saving collection, etc.

## requirements

- [jupyter notebook](https://github.com/jupyter/notebook) >= 4.0
- [Lmod](https://github.com/TACC/Lmod) >= 6.0

## setup

### install
```
pip install jupyterlmod
jupyter nbextension install --py jupyterlmod [--sys-prefix|--user]
```

### enable
```
jupyter nbextension enable --py jupyterlmod [--sys-prefix|--system]
jupyter serverextension enable --py jupyterlmod [--sys-prefix|--system]
```

## demo

![Jupyter-lmod demo](http://i.imgur.com/IP9uUJp.gif)
