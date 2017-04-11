#!/usr/bin/env python
# coding: utf-8

from setuptools import setup

setup_args = dict(
    name                = 'jupyterlmod',
    packages            = ['jupyterlmod', 'lmod'],
    package_data        = {'jupyterlmod' : ['static/*']},
    version             = "1.5.0",
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
        'License :: OSI Approved :: BSD License',
        'Programming Language :: Python',
        'Programming Language :: Python :: 3',
    ],
    install_requires   = [
    'jupyter>=1.0.0',
    ],
)

def main():
    setup(**setup_args)

if __name__ == '__main__':
    main()
