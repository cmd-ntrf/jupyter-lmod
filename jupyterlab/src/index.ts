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

import { Lmod } from './lmod.js';

function createModuleItem(label: string, button: string) {
  const lmod_list_line = document.createElement('li');
  const lmod_list_label = document.createElement('span');
  const lmod_list_button = document.createElement('button');
  lmod_list_line.append(lmod_list_label);
  lmod_list_line.append(lmod_list_button);
  lmod_list_line.setAttribute('class', 'jp-RunningSessions-item')
  lmod_list_label.setAttribute('class', 'jp-RunningSessions-itemLabel');
  lmod_list_label.innerText = label;
  lmod_list_button.setAttribute('class', 'jp-RunningSessions-itemShutdown jp-mod-styled')
  lmod_list_button.innerHTML = button;
  return lmod_list_line;
}

const lmodAPI = new Lmod(PageConfig.getBaseUrl());

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
    const data = await lmodAPI.show(module);
    const datalist = data.split('\n');
    const text = datalist.slice(3).join('\n').trim();
    const path = datalist[1].slice(0, -1);
    showDialog({
          title: module,
          body: new ModuleWidget(path, text),
          buttons: [
            Dialog.okButton()
          ]
    });
}

async function export_module() {
    const data = await lmodAPI.freeze();
    showDialog({
          title: "Export modules",
          body: new ModuleWidget("Add this in a notebook to load the same modules :", data),
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
      lmodAPI.save(name ? name : 'default');
    }
    return;
  });
}

/**
 * Main widget
 */
class LmodWidget extends Widget {
  protected loadedUList: HTMLUListElement;
  protected availUList: HTMLUListElement;
  protected searchInput: HTMLInputElement;
  protected searchSource: Array<string>;

  constructor() {
    super();

    this.id = 'lmod-jupyterlab';
    this.title.caption = 'Softwares';
    this.title.iconClass = 'jp-LmodIcon jp-SideBar-tabIcon'
    this.addClass('jp-RunningSessions');

    const search_div = document.createElement('div');
    const search_div_wrapper = document.createElement('div');
    this.searchInput = document.createElement('input');
    search_div.setAttribute('class', 'lm-CommandPalette-search');
    search_div_wrapper.setAttribute('class', 'lm-CommandPalette-wrapper');
    this.searchInput.setAttribute('id', 'modules');
    this.searchInput.setAttribute('class', 'lm-CommandPalette-input');
    this.searchInput.setAttribute('placeholder', 'Search available modules...')
    search_div.appendChild(search_div_wrapper);
    search_div_wrapper.appendChild(this.searchInput);
    this.node.insertAdjacentElement('afterbegin', search_div);

    this.node.insertAdjacentHTML('beforeend',
      `<div id="lmod" class="lm-CommandPalette-content">
          <div class="jp-RunningSessions-section">
              <div class="jp-RunningSessions-sectionHeader"><H2>Loaded Modules</H2>
                  <button
                    title="Create collection"
                    class="jp-Lmod-collectionButton jp-mod-styled jp-AddIcon"
                    id="save-button"
                  ></button>
                  <button
                    title="Restore collection"
                    class="jp-Lmod-collectionButton jp-mod-styled jp-UndoIcon"
                    id="restore-button"
                  ></button>
                  <button
                    title="Generate Python code"
                    class="jp-Lmod-collectionButton jp-mod-styled jp-CopyIcon"
                    id="export-button"
                  ></button>
              </div>
              <div class="jp-RunningSessions-sectionContainer">
                  <ul class="jp-RunningSessions-sectionList" id="lmod_loaded_list">
                  </ul>
              </div>
          </div>
          <div class="jp-RunningSessions-section">
              <div class="jp-RunningSessions-sectionHeader" id="avail_header"><H2>Available Modules</H2>
              </div>
              <div class="jp-RunningSessions-sectionContainer">
                  <ul class="jp-RunningSessions-sectionList" id="lmod_avail_list">
                  </ul>
              </div>
          </div>
      </div>`);

    this.loadedUList = this.node.querySelector('#lmod_loaded_list');
    this.availUList = this.node.querySelector('#lmod_avail_list');

    this.loadedUList.addEventListener('click', this.onClickModuleList.bind(this));
    this.availUList.addEventListener('click', this.onClickModuleList.bind(this));

    const buttons = this.node.getElementsByClassName('jp-Lmod-collectionButton')
    buttons['save-button'].addEventListener('click', save_collection);
    buttons['restore-button'].addEventListener('click', this.restore.bind(this));
    buttons['export-button'].addEventListener('click', export_module);
    this.searchInput.addEventListener('keyup', this.updateAvail.bind(this));
  }

  protected async onClickModuleList(event) {
    const target = event.target;
    if (target.tagName == 'SPAN') {
      show_module(target.innerText);
    } else if(target.tagName == 'BUTTON') {
      const span = event.target.closest('li').querySelector('span');
      const item = span.innerText;
      if(target.innerText == 'Load') {
        await lmodAPI.load(item);
      } else if(target.innerText == 'Unload') {
        await lmodAPI.unload(item);
      }
      this.update();
    }
  }

  public update() {
    Promise.all([lmodAPI.avail(), lmodAPI.list()])
    .then(values => {
        const avail_set = new Set<string>(values[0]);
        const modulelist = values[1].sort();
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
        lmodAPI.restore(name);
        this.update();
      }
      return;
    });
  }
}

async function setup_proxy_commands() {
  const response = await fetch(PageConfig.getBaseUrl() + 'server-proxy/servers-info');
  if (!response.ok) {
    console.log('jupyter-lmod: could not communicate with jupyter-server-proxy API.');
    return;
  }
  const data = await response.json();

  const namespace = 'server-proxy';
  const command = namespace + ':' + 'open';
  for (let server_process of data.server_processes) {
    const url = PageConfig.getBaseUrl() + server_process.name + '/';
    const title = server_process.launcher_entry.title;
    const newBrowserTab = server_process.new_browser_tab;
    const id = namespace + ':' + server_process.name;
    const launcher_item : ILauncher.IItemOptions = {
      command: command,
      args: {
        url: url,
        title: title + (newBrowserTab ? ' [🡕]': ''),
        newBrowserTab: newBrowserTab,
        id: id
      },
      category: 'Notebook'
    };

    if (server_process.launcher_entry.icon_url) {
      launcher_item.kernelIconUrl =  server_process.launcher_entry.icon_url;
    }
    server_proxy_infos[server_process.name] = launcher_item;
  }
}

/**
 * Activate the lmod widget extension.
 */
function activate(
  app: JupyterFrontEnd,
  palette: ICommandPalette,
  restorer: ILayoutRestorer,
  launcher: ILauncher
) {
  const widget = new LmodWidget();

  global_launcher = launcher;
  kernelspecs = app.serviceManager.kernelspecs;
  setup_proxy_commands();

	restorer.add(widget, 'lmod-sessions');
  app.shell.add(widget, 'left', { rank: 1000 });
  widget.update();
  console.log('JupyterFrontEnd extension lmod is activated!');
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
    lmodAPI.savelist()
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

class ModuleWidget extends Widget {
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
