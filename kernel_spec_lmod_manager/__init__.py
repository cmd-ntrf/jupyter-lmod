# -*- coding: utf-8 -*-
# vim: tabstop=8 expandtab shiftwidth=4 softtabstop=4
from jupyter_client.kernelspec import KernelSpec, KernelSpecManager

import json
import lmod
from os.path import join as pjoin

class KernelSpecLMod(KernelSpec):
    @classmethod
    def from_resource_dir(cls, resource_dir):
        """
        """
        kernel_file = pjoin(resource_dir, 'kernel.json')
        with open(kernel_file, 'r', encoding='utf-8') as f:
            kernel_dict = json.load(f)
        for module in kernel_dict.get('lmod', []):
	    lmod.module('load', module)
        return cls(resource_dir=resource_dir, **kernel_dict)

class KernelSpecLModManager(KernelSpecManager):
    kernel_spec_class = KernelSpecLMod
