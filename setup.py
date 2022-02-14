#!/usr/bin/env python
# coding: utf-8
from glob import glob
from setuptools import setup

setup_args = dict(
    name                = 'jupyterlmod',
    packages            = ['jupyterlmod', 'lmod'],
    version             = "3.0.0",
    description         = "jupyterlmod: notebook server extension to interact with Lmod system",
    long_description    = "Jupyter interactive notebook server extension that allows user to select software modules to load with Lmod before launching kernels.",
    author              = "Félix-Antoine Fortin",
    author_email        = "felix-antoine.fortin@calculquebec.ca",
    url                 = "http://www.calculquebec.ca",
    license             = "MIT",
    platforms           = "Linux, Mac OS X",
    keywords            = ['Interactive', 'Interpreter', 'Shell', 'Web', 'Lmod'],
    classifiers         = [
        'Intended Audience :: Developers',
        'Intended Audience :: System Administrators',
        'Intended Audience :: Science/Research',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python',
        'Programming Language :: Python :: 3',
    ],
    install_requires   = [
        'notebook>=6.0.0',
        'jupyter-server>=1.0'
    ],
    data_files=[
        ('share/jupyter/nbextensions/jupyterlmod', glob('jupyterlmod/static/*')),
        ('etc/jupyter/jupyter_notebook_config.d', ['jupyterlmod/etc/jupyterlmod_serverextension.json']),
        ("etc/jupyter/jupyter_server_config.d", ['jupyterlmod/etc/jupyterlmod_jupyterserverextension.json']),
        ('etc/jupyter/nbconfig/tree.d', ['jupyterlmod/etc/jupyterlmod_nbextension.json'])
    ],
    zip_safe=False
)

def main():
    setup(**setup_args)

if __name__ == '__main__':
    main()
