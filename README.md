# Jupyter Lmod

Jupyter interactive notebook server extension that allows user 
to select modules to load before launching kernels.

## requirements

- [jupyter notebook](https://github.com/jupyter/notebook) >= 4.0
- [jquery-ui](https://jqueryui.com/) (autocomplete) >= 1.9.0
- [Lmod](https://github.com/TACC/Lmod) >= 6.0

## setup

### Install
```
pip https://github.com/cmd-ntrf/jupyter-lmod.git
```

Download [jquery-ui](https://jqueryui.com/) and copy the file `jquery-ui.min.js` in the folder returned by the following command
```
echo $(jupyter --data-dir)/nbextensions
```

### Execute
```
jupyter notebook  --NotebookApp.server_extensions='["jupyterlmod"]'
```

## demo

![Jupyter-lmod demo](http://i.imgur.com/IP9uUJp.gif)
