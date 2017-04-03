# Jupyter Lmod

Jupyter interactive notebook server extension that allows user 
to select modules to load before launching kernels.

## requirements

- [jupyter notebook](https://github.com/jupyter/notebook) >= 4.0
- [Lmod](https://github.com/TACC/Lmod) >= 6.0

## setup

### Install
```
pip git+https://github.com/cmd-ntrf/jupyter-lmod.git
```

### Execute
```
jupyter notebook  --NotebookApp.server_extensions='["jupyterlmod"]'
```

## demo

![Jupyter-lmod demo](http://i.imgur.com/IP9uUJp.gif)
