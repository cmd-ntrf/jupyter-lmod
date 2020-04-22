import {
  JupyterFrontEnd, JupyterFrontEndPlugin, ILayoutRestorer
} from '@jupyterlab/application';

import {
  Dialog, showDialog, ICommandPalette
} from '@jupyterlab/apputils';

import {
  Widget
} from '@lumino/widgets';

import { PageConfig } from '@jupyterlab/coreutils';

import $ from "jquery";

import * as Lmod from '../../jupyterlmod/static/lmod.js';

var lmod_list_line = $(`
  <li class="jp-RunningSessions-item">
     <span class="jp-RunningSessions-itemLabel"></span>
     <button class="jp-RunningSessions-itemShutdown jp-mod-styled"></button>
  </li>`)

var lmod = new Lmod.Lmod(PageConfig.getBaseUrl());

var search_source = [];
var kernelspecs = null;

function refresh_module_list() {
    Promise.all([lmod.avail(), lmod.list()])
    .then(values => {
        let avail_set = new Set(values[0]);
        let modulelist = values[1].sort();

        let list = $("#lmod_list");
        list.children().remove();

        modulelist.map(item => {
            let li = lmod_list_line.clone();
            li.find('span').text(item).click(e => show_module(item));
            li.find('button').text('Unload').click(e => lmod.unload(item).then(refresh_module_list));
            list.append(li);
            avail_set.delete(item)
        });

        search_source = Array.from(avail_set);
        refresh_avail_list();
    });
    kernelspecs.refreshSpecs();
}

function refresh_avail_list() {
    let input = (document.getElementById('modules') as HTMLInputElement).value;
    let list = $("#avail_list");
    list.children().remove();

    const result = search_source.filter(
      str => str.toUpperCase().includes(input.toUpperCase())
    );

    result.map(item => {
        let li = lmod_list_line.clone();
        li.find('span').text(item).click(e => show_module(item));
        li.find('button').text('Load').click(e => lmod.load(item).then(refresh_module_list));
        list.append(li);
    });
}

async function show_module(module) {
    let data = await lmod.show(module);
    let datalist = data.split('\n');
    let text = $.trim(datalist.slice(3).join('\n'));
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
class LmodWidget extends Widget {
  constructor() {
    super();

    this.id = 'lmod-jupyterlab';
    this.title.caption = 'Softwares';
    this.title.iconClass = 'jp-LmodIcon jp-SideBar-tabIcon'
    this.addClass('jp-RunningSessions');

    this.node.insertAdjacentHTML('afterbegin',
      `<div class="lm-CommandPalette-search">
          <div class="lm-CommandPalette-wrapper">
              <input id="modules" class="lm-CommandPalette-input" placeholder="Search available modules..." >
          </div>
      </div>
      <div id="lmod" class="lm-CommandPalette-content">
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

    let buttons = this.node.getElementsByClassName('jp-Lmod-collectionButton')
    buttons['save-button'].addEventListener('click', function(e) {return save_collection(e);});
    buttons['restore-button'].addEventListener('click', function(e) {return restore_collection(e);});
    buttons['export-button'].addEventListener('click', function(e) {return export_module();});
    this.node.getElementsByClassName('lm-CommandPalette-input')['modules']
      .addEventListener('keyup', function(e) {return refresh_avail_list();});
    refresh_module_list();
  }
};


/**
 * Activate the lmod widget extension.
 */
function activate(app: JupyterFrontEnd, palette: ICommandPalette, restorer: ILayoutRestorer) {
  console.log('JupyterFrontEnd extension lmod is activated!');

  let widget: LmodWidget;

  kernelspecs = app.serviceManager.kernelspecs;

  widget = new LmodWidget();
  app.shell.activateById(widget.id);

	restorer.add(widget, 'lmod-sessions');
  app.shell.add(widget, 'left', { rank: 1000 });
};

const extension: JupyterFrontEndPlugin<void> = {
  id: 'jupyterlab_lmod',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer],
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
