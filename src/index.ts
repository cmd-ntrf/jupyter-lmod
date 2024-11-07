import {
  JupyterFrontEnd, JupyterFrontEndPlugin, ILayoutRestorer
} from '@jupyterlab/application';

import {
  Dialog, showDialog, ICommandPalette
} from '@jupyterlab/apputils';

import {
  Widget
} from '@lumino/widgets';

import { ILauncher } from '@jupyterlab/launcher';
import { PageConfig } from '@jupyterlab/coreutils';

import { Module } from '../jupyterlmod/static/module.js';

import * as serverproxy from '@jupyterhub/jupyter-server-proxy';

import { LabIcon } from '@jupyterlab/ui-components';

import lmodIconSvg from './assets/lmod.svg';
import tmodIconSvg from './assets/tmod.svg';
export const jplmodIcons = {
    lmod: new LabIcon({
      name: 'jupyter_lmod:lmod_logo',
      svgstr: lmodIconSvg
    }),
    tmod: new LabIcon({
      name: 'jupyter_lmod:tmod_logo',
      svgstr: tmodIconSvg
    })
};

function createModuleItem(label: string, button: string) {
  const module_list_line = document.createElement('li');
  const module_list_label = document.createElement('span');
  const module_list_button = document.createElement('button');
  module_list_line.append(module_list_label);
  module_list_line.append(module_list_button);
  module_list_line.setAttribute('class', 'jp-Module-item')
  module_list_label.setAttribute('class', 'jp-Module-itemLabel');
  module_list_label.innerText = label;
  module_list_button.setAttribute('class', 'jp-Module-itemButton jp-mod-styled')
  module_list_button.innerHTML = button;
  return module_list_line;
}

const moduleAPI = new Module(PageConfig.getBaseUrl());

var global_launcher = null;
var kernelspecs = null;
var server_proxy_infos = {};
var server_proxy_launcher = {};

function updateLauncher(modulelist) {
  for(let server_key in server_proxy_infos) {
    let is_enabled = modulelist.some(module => { return module.toLowerCase().includes(server_key) });
    if(is_enabled) {
      if(!server_proxy_launcher.hasOwnProperty(server_key)) {
        server_proxy_launcher[server_key] = global_launcher.add(server_proxy_infos[server_key])
      }
    } else if(server_proxy_launcher.hasOwnProperty(server_key)) {
      server_proxy_launcher[server_key].dispose();
      delete server_proxy_launcher[server_key];
    }
  }
}

async function show_module(module) {
    const data = await moduleAPI.show(module);
    const datalist = data.split('\n');
    const text = datalist.slice(3).join('\n').trim();
    const path = datalist[1].slice(0, -1);
    showDialog({
          title: module,
          body: new ModuleDialogWidget(path, text),
          buttons: [
            Dialog.okButton()
          ]
    });
}

async function load_module(module) {
    const data = await moduleAPI.load([module]);
    if(data != null){
        showDialog({
            title: "Module warning",
            body: new ModuleDialogWidget("Warning", data),
            buttons: [Dialog.okButton()]
        });
    }
}

async function export_module() {
    const data = await moduleAPI.freeze();
    showDialog({
          title: "Export modules",
          body: new ModuleDialogWidget("Add this in a notebook to load the same modules :", data),
          buttons: [
            Dialog.okButton()
          ]
    });
}

function save_collection(event): Promise<void | undefined> {
  return showDialog({
        title: 'Save collection',
        body: new SaveWidget(),
        buttons: [
          Dialog.cancelButton(),
          Dialog.okButton({ label: 'Save' })
        ]
  }).then(result => {
    if (result.button.label === 'Save') {
      let name = result.value;
      moduleAPI.save(name ? name : 'default');
    }
    return;
  });
}

/**
 * Main widget
 */
class ModuleWidget extends Widget {
  protected loadedUList: HTMLUListElement;
  protected availUList: HTMLUListElement;
  protected availHeader: HTMLHeadingElement;
  protected searchInput: HTMLInputElement;
  protected searchSource: Array<string>;

  constructor() {
    super();

    this.id = 'module-jupyterlab';
    this.title.caption = 'Software Modules';
    this.addClass('jp-Module');

    const search_div = document.createElement('div');
    const search_div_wrapper = document.createElement('div');
    this.searchInput = document.createElement('input');
    search_div.setAttribute('class', 'jp-Module-search');
    search_div_wrapper.setAttribute('class', 'jp-Module-search-wrapper');
    this.searchInput.setAttribute('id', 'modules');
    this.searchInput.setAttribute('class', 'jp-Module-input');
    this.searchInput.setAttribute('placeholder', 'Filter available modules...')
    search_div.appendChild(search_div_wrapper);
    search_div_wrapper.appendChild(this.searchInput);
    this.node.insertAdjacentElement('afterbegin', search_div);

    this.node.insertAdjacentHTML('beforeend',
      `<div id="module" class="jp-Module-content">
          <div class="jp-Module-section">
              <div class="jp-Module-sectionHeader"><H2>Loaded Modules</H2>
                  <button
                    title="Create collection"
                    class="jp-Module-collectionButton jp-mod-styled jp-AddIcon"
                    id="save-button"
                  ></button>
                  <button
                    title="Restore collection"
                    class="jp-Module-collectionButton jp-mod-styled jp-UndoIcon"
                    id="restore-button"
                  ></button>
                  <button
                    title="Generate Python code"
                    class="jp-Module-collectionButton jp-mod-styled jp-CopyIcon"
                    id="export-button"
                  ></button>
              </div>
              <div class="jp-Module-sectionContainer">
                  <ul class="jp-Module-sectionList" id="module_loaded_list">
                  </ul>
              </div>
          </div>
          <div class="jp-Module-section">
              <div class="jp-Module-sectionHeader">
                <h2 id="module_avail_header">Available Modules</h2>
              </div>
              <div class="jp-Module-sectionContainer">
                <ul class="jp-Module-sectionList" id="module_avail_list">
                </ul>
              </div>
          </div>
      </div>`);

    this.loadedUList = this.node.querySelector('#module_loaded_list');
    this.availUList = this.node.querySelector('#module_avail_list');
    this.availHeader = this.node.querySelector('#module_avail_header');

    this.loadedUList.addEventListener('click', this.onClickModuleList.bind(this));
    this.availUList.addEventListener('click', this.onClickModuleList.bind(this));

    const buttons = this.node.getElementsByClassName('jp-Module-collectionButton')
    buttons['save-button'].addEventListener('click', save_collection);
    buttons['restore-button'].addEventListener('click', this.restore.bind(this));
    buttons['export-button'].addEventListener('click', export_module);
    this.searchInput.addEventListener('keyup', this.updateAvail.bind(this));
  }

  public setIcon() {
    Promise.all([moduleAPI.system()])
    .then(values => {
      const modulesys = values[0];
      console.log("Module system found:", modulesys)
      // Set icon based on module system
      this.title.icon = jplmodIcons[modulesys];
    });
  }

  protected async onClickModuleList(event) {
    const target = event.target;
    if (target.tagName == 'SPAN') {
      show_module(target.innerText);
    } else if(target.tagName == 'BUTTON') {
      const parent_li = event.target.closest('li');
      const mod_label = parent_li.querySelector('span');
      const mod_name = mod_label.innerText;
      if(target.innerText == 'Load') {
        target.innerText = 'Loading...';
        target.style.visibility = 'visible';
        target.style.backgroundColor = "#99b644";
        parent_li.style.backgroundColor = "#dde6c0";
        await load_module(mod_name);
      } else if(target.innerText == 'Unload') {
        target.innerText = 'Unloading...';
        target.style.visibility = 'visible';
        target.style.backgroundColor = "#ee8b44";
        parent_li.style.backgroundColor = "#fad7c0";
        await moduleAPI.unload([mod_name]);
      }
      this.update();
    }
  }

  public update() {
    Promise.all([moduleAPI.avail(), moduleAPI.list()])
    .then(values => {
        const avail_set = new Set<string>(values[0]);
        const modulelist = values[1];

        const html_list = modulelist.map(item => createModuleItem(item, 'Unload'));

        this.loadedUList.innerText = '';
        this.loadedUList.append(...html_list);

        modulelist.map(item => avail_set.delete(item));
        this.searchSource = Array.from(avail_set);
        this.updateAvail();
        updateLauncher(modulelist);
    });
    kernelspecs.refreshSpecs();
  }

  protected updateAvail() {
    const input = this.searchInput.value;
    this.availUList.innerText = '';

    const result = this.searchSource.filter(
      str => str.toUpperCase().includes(input.toUpperCase())
    );

    const html_list = result.map(item => createModuleItem(item, 'Load'));
    this.availUList.append(...html_list);
    this.availHeader.innerText = `Available Modules (${result.length})`;
  }

  protected restore(event): Promise<void | undefined> {
    return showDialog({
          title: 'Restore collection',
          body: new RestoreWidget(),
          buttons: [
            Dialog.cancelButton(),
            Dialog.okButton({ label: 'Restore' })
          ]
    }).then(result => {
      if (result.button.label === 'Restore') {
        const name = result.value;
        moduleAPI.restore(name).then(() => this.update());
      }
      return;
    });
  }
}


/**
 * Class that intercepts items that would be
 * added to JupyterLab launcher by jupyter-server-proxy
 * to either add them to the launcher if their name
 * is in the launcher pin list, or keep them in a
 * seperate data structure until the corresponding
 * module is loaded.
 */
class ILauncherProxy {
  private launcher_pins: Array<String>;
  constructor(launcher_pins: Array<String>) {
    this.launcher_pins = launcher_pins;
  }
  add(item) {
    let name = item.args.id.split(':')[1];
    if (this.launcher_pins.includes(name.toLowerCase())) {
      global_launcher.add(item)
    } else {
      server_proxy_infos[name] = item;
    }
  }
}

async function setup_proxy_commands(app: JupyterFrontEnd, restorer: ILayoutRestorer) {
  let launcher_pins = [];
  const pin_response = await fetch(
    PageConfig.getBaseUrl() + 'module/launcher-pins',
    {
      headers: moduleAPI._head_auth,
    },
  );
  if (pin_response.ok) {
    const data = await pin_response.json();
    launcher_pins = data.launcher_pins.map(pin => pin.toLowerCase())
  } else {
    console.log('jupyter-{lmod/tmod}: could not communicate with jupyter-{lmod/tmod} API.');
  }

  let tmp_launcher = new ILauncherProxy(launcher_pins);
  serverproxy.default.activate(app, tmp_launcher, restorer);
}

/**
 * Activate the module widget extension.
 */
function activate(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  restorer: ILayoutRestorer,
  launcher: ILauncher
) {
  const widget = new ModuleWidget();
  widget.setIcon();

  global_launcher = launcher;
  kernelspecs = app.serviceManager.kernelspecs;

  setup_proxy_commands(app, restorer);

  restorer.add(widget, 'module-sessions');
  app.shell.add(widget, 'left', { rank: 1000 });
  widget.update();
  console.log('JupyterFrontEnd extension lmod/tmod is activated!');
};

const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_lmod',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer, ILauncher],
  activate: activate
};

class SaveWidget extends Widget {
  constructor() {
    let body = document.createElement('div');
    let text = document.createElement('label');
    text.innerHTML = "Enter a new collection name:";
    body.appendChild(text);

    let input = document.createElement('input');
    input.placeholder = "default";
    body.appendChild(input);

    super({ node: body });
  }

  getValue(): string {
    return (this.node.querySelector('input') as HTMLInputElement).value;
  }
}

class RestoreWidget extends Widget {
  constructor() {
    let body = document.createElement('div');
    let text = document.createElement('label');
    text.innerHTML = "Select a collection to restore :";
    body.appendChild(text);

    let selector = document.createElement('select');
    moduleAPI.savelist()
    .then(values => {
        values.map((item, index) => {
            let opt = document.createElement("option");
            opt.value = item;
            opt.text = item;
            selector.add(opt);
        })
    });

    body.appendChild(selector);
    super({ node: body });
  }

  getValue(): string {
    return (this.node.querySelector('select') as HTMLSelectElement).value;
  }
}

class ModuleDialogWidget extends Widget {
  constructor(labelText, content) {
    let body = document.createElement('div');

    let label = document.createElement('label');
    label.innerHTML = labelText;
    body.appendChild(label);

    let div = document.createElement('div');
    div.classList.add('jp-JSONEditor-host');
    div.setAttribute("style", "min-height:inherit;");
    let text = document.createElement('pre');
    text.setAttribute("style", "margin:10px 10px; white-space:pre-wrap;");
    text.innerHTML = content;
    div.appendChild(text);
    body.appendChild(div);

    super({ node: body });
  }
}

export default extension;
