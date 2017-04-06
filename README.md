# Jupyter Lmod

Jupyter interactive notebook server extension that allows user 
to select modules to load before launching kernels.

## requirements

- [jupyter notebook](https://github.com/jupyter/notebook) >= 4.0
- [Lmod](https://github.com/TACC/Lmod) >= 6.0

## setup

```
pip install jupyterlmod
jupyter nbextension install --py jupyterlmod [--sys-prefix|--user]
jupyter nbextension enable --py jupyterlmod [--sys-prefix|--system]
jupyter serverextension enable --py jupyterlmod [--sys-prefix|--system]
```

## demo

![Jupyter-lmod demo](http://i.imgur.com/IP9uUJp.gif)
