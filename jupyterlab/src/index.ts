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

import * as Lmod from '../../jupyterlmod/static/lmod.js';

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

var lmod = new Lmod.Lmod(PageConfig.getBaseUrl());

var global_launcher = null;
var search_source = [];
var kernelspecs = null;
var server_proxy_infos = {};
var server_proxy_launcher = {};
var module_input = null;
var lmod_list = null;
var avail_list = null;

function refresh_module_list() {
    Promise.all([lmod.avail(), lmod.list()])
    .then(values => {
        const avail_set = new Set(values[0]);
        const modulelist = values[1].sort();
        const html_list = modulelist.map(item => createModuleItem(item, 'Unload'));

        lmod_list.innerText = '';
        lmod_list.append(...html_list);

        modulelist.map(item => avail_set.delete(item));
        search_source = Array.from(avail_set);
        refresh_avail_list();
        refresh_launcher(modulelist);
    });
    kernelspecs.refreshSpecs();
}

function refresh_launcher(modulelist) {
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

function refresh_avail_list() {
    const input = module_input.value;
    avail_list.innerText = '';

    const result = search_source.filter(
      str => str.toUpperCase().includes(input.toUpperCase())
    );

    const html_list = result.map(item => createModuleItem(item, 'Load'));
    avail_list.append(...html_list);
}

async function show_module(module) {
    let data = await lmod.show(module);
    let datalist = data.split('\n');
    let text = datalist.slice(3).join('\n').trim();
    let path = datalist[1].slice(0, -1);
    showDialog({
          title: module,
          body: new ModuleWidget(path, text),
          buttons: [
            Dialog.okButton()
          ]
    });
}

async function export_module() {
    let data = await lmod.freeze();
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
      lmod.save(name ? name : 'default');
    }
    return;
  });
}

function restore_collection(event): Promise<void | undefined> {
  return showDialog({
        title: 'Restore collection',
        body: new RestoreWidget(),
        buttons: [
          Dialog.cancelButton(),
          Dialog.okButton({ label: 'Restore' })
        ]
  }).then(result => {
    if (result.button.label === 'Restore') {
      let name = result.value;
      lmod.restore(name);
      refresh_module_list();
    }
    return;
  });
}
/**
 * Main widget
 */
function clickListorAvail(event) {
  const target = event.target;
  if (target.tagName == 'SPAN') {
    show_module(target.innerText);
  } else if(target.tagName == 'BUTTON') {
    const span = event.target.closest('li').querySelector('span');
    const item = span.innerText;
    if(target.innerText == 'Load') {
      lmod.load(item).then(refresh_module_list);
    } else if(target.innerText == 'Unload') {
      lmod.unload(item).then(refresh_module_list);
    }
  }
}

class LmodWidget extends Widget {
  constructor() {
    super();

    this.id = 'lmod-jupyterlab';
    this.title.caption = 'Softwares';
    this.title.iconClass = 'jp-LmodIcon jp-SideBar-tabIcon'
    this.addClass('jp-RunningSessions');

    const search_div = document.createElement('div');
    const search_div_wrapper = document.createElement('div');
    module_input = document.createElement('input');
    search_div.setAttribute('class', 'lm-CommandPalette-search');
    search_div_wrapper.setAttribute('class', 'lm-CommandPalette-wrapper');
    module_input.setAttribute('id', 'modules');
    module_input.setAttribute('class', 'lm-CommandPalette-input');
    module_input.setAttribute('placeholder', 'Search available modules...')
    search_div.appendChild(search_div_wrapper);
    search_div_wrapper.appendChild(module_input);
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
                  <ul class="jp-RunningSessions-sectionList" id="lmod_list">
                  </ul>
              </div>
          </div>
          <div class="jp-RunningSessions-section">
              <div class="jp-RunningSessions-sectionHeader" id="avail_header"><H2>Available Modules</H2>
              </div>
              <div class="jp-RunningSessions-sectionContainer">
                  <ul class="jp-RunningSessions-sectionList" id="avail_list">
                  </ul>
              </div>
          </div>
      </div>`);

    lmod_list = this.node.querySelector('#lmod_list');
    avail_list = this.node.querySelector('#avail_list');

    lmod_list.addEventListener('click', clickListorAvail);
    avail_list.addEventListener('click', clickListorAvail);

    let buttons = this.node.getElementsByClassName('jp-Lmod-collectionButton')
    buttons['save-button'].addEventListener('click', function(e) {return save_collection(e);});
    buttons['restore-button'].addEventListener('click', function(e) {return restore_collection(e);});
    buttons['export-button'].addEventListener('click', function(e) {return export_module();});
    module_input.addEventListener('keyup', function(e) {return refresh_avail_list();});
  }
};

// tslint:disable: variable-name
class IFrameWidget extends Widget {
  constructor(title: string, path: string) {
    super();
    this.id = path;

    this.title.label = title;
    this.title.closable = true;

    const div = document.createElement("div");
    div.classList.add("iframe-widget");
    const iframe = document.createElement("iframe");
    iframe.src = path;
    div.appendChild(iframe);
    this.node.appendChild(div);
  }
}

function setup_proxy_commands(serverData, app) {
  for (let server_process of serverData.server_processes) {
    if (!server_process.launcher_entry.enabled) {
      continue;
    }

    let commandId = 'server-proxy:' + server_process.name;
    let launch_url = PageConfig.getBaseUrl() + server_process.name + '/';
    let widget = new IFrameWidget(server_process.launcher_entry.title, launch_url);

    app.commands.addCommand(commandId, {
      label: server_process.launcher_entry.title,
      execute: () => {
        if (!widget.isAttached) {
          app.shell.add(widget);
        }
        app.shell.activateById(widget.id);
      }
    });

    let command : ILauncher.IItemOptions = {
      command: commandId,
      category: 'Notebook'
    };
    if (server_process.launcher_entry.icon_url) {
      command.kernelIconUrl =  server_process.launcher_entry.icon_url;
    }
    server_proxy_infos[server_process.name] = command;
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

  fetch(PageConfig.getBaseUrl() + 'server-proxy/servers-info').then(
    response => {
      if (response.ok) {
        response.json().then(data => setup_proxy_commands(data, app));
      }
    }
  )

	restorer.add(widget, 'lmod-sessions');
  app.shell.add(widget, 'left', { rank: 1000 });
  refresh_module_list();
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
    lmod.savelist()
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
