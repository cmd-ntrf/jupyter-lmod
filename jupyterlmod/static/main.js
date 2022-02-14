define(function(require) {
    "use strict";
    var $ = require('jquery');
    var ui = require('jquery-ui');
    var dialog = require('base/js/dialog');
    var lmod_class = require('./lmod');
    var utils = require('base/js/utils');

    var base_url = utils.get_body_data("baseUrl");

    var lmod = new lmod_class.Lmod(base_url);
    var search_source = null;

    var server_proxy_infos = {};
    var server_proxy_launcher = {};

    const lmod_tab_html = $([
'<div id="lmod" class="tab-pane">',
'    <div id="lmod_toolbar" class="row list_toolbar">',
'        <div class="col-sm-18 no-padding">',
'            <input id="modules" class="form-control input-lg" placeholder="Search available modules..." style="width:100%">',
'        </div>',
'    </div>',
'    <div class="list_container" id="lmod_list">',
'        <div class="row list_header" id="list_header">',
'            <div class="col-sm-8">Loaded Modules</div>',
'            <div class="col-sm-4 no-padding tree-buttons">',
'                <div class="pull-right">',
'                    <div class="btn-group">',
'                        <button title="Show hidden modules" id="show_hidden_btn" aria-label="Show hidden modules" type="button" class="btn btn-default btn-xs" role="checkbox" style="min-width:50px">',
'                            <input type="checkbox" id="show_hidden" style="margin-left:0px;margin-right:4px;margin-top:3px;height=16px">',
'                            <i class="fa fa-eye-slash" aria-hidden="true"></i>',
'                        </button>',
'                    </div>',
'                    <div class="btn-group">',
'                        <button class="dropdown-toggle btn btn-default btn-xs" data-toggle="dropdown">',
'                            <span>Collection</span>',
'                            <span class="caret"/>',
'                        </button>',
'                        <ul class="dropdown-menu", id="restore-menu">',
'                            <li id="save-collection"><a aria-label="save-collection" role="menuitem" href="#" title="Save module list to collection">Save</a></li>',
'                            <li role="presentation" class="divider"></li>',
'                            <li id="restore-header" role="menuitem" class="dropdown-header" style="font-size: 10px;border-bottom: 1px solid #e5e5e5;padding: 0 0 3px;margin: -3px 20px 0;">Restore:</li>',
'                        </ul>',
'                    </div>',
'                    <div class="btn-group">',
'                        <button class="btn btn-default btn-xs" id="edit-button" title="Edit MODULEPATH"><i class="fa fa-wrench" aria-hidden="true"></i></button>',
'                    </div> ',
'                </div>',
'            </div>',
'        </div>',
'    </div>',
'</div>',
    ].join('\n'));

    const lmod_list_line = $([
'<div class="list_item row">',
'   <div class="col-md-12">',
'       <a href="#lmod_list"></a>',
'       <div class="item_buttons pull-right">',
'           <button class="btn btn-default btn-xs" id="reload" title="Reload module"><i class="fa fa-refresh" aria-hidden="true"></i></button>',
'           <button class="btn btn-default btn-xs" id="unload" title="Unload module"><i class="fa fa-trash-o" aria-hidden="true"></i></button>',
'       </div>',
'   </div>',
'</div>',
    ].join('\n'));

    const save_dialog_body = $([
'<div>',
'   <p class="save-message">Enter a new collection name:</p>',
'   <br/>',
'   <input type="text" size="25" class="form-control" placeholder="default">',
'</div>'
    ].join('\n'));

    const modulepath_dialog_body = $([
        '<div class="ui-front">',
        '    <div id="lmod_toolbar" class="row list_toolbar">',
        '        <input id="path_input" class="form-control" placeholder="Enter path here..." style="width:70%;float:left;"">',
        '        <div class="btn-group" style="width:30%;float:left;">',
        '            <button class="btn btn-default" id="prepend_path" title="Prepend to MODULEPATH" style="width:50%;float:left;">Prepend <i class="fa fa-arrow-up" aria-hidden="true"></i></button>',
        '            <button class="btn btn-default" id="append_path" title="Append to MODULEPATH" style="width:50%;float:left;">Append <i class="fa fa-arrow-down" aria-hidden="true"></i></button>',
        '        </div>',
        '    </div>',
        '   <div id="path_list" class="list_container">',
        '   </div>',
        '</div>'
    ].join('\n'));

    async function draw_modulepath_dialog() {
        const paths = await lmod.paths();

        const list = $("#path_list").html("");

        const path_input = $( "#path_input" )
        .on('keyup', function (event) {
            if (event.keyCode == $.ui.keyCode.ENTER) {
                var paths = event.target.value;
                if (paths != '') {
                    lmod.use([paths])
                    .then(draw_modulepath_dialog)
                    .then(refresh_module_ui);
                }
                event.target.value = "";
            }
        })
        .autocomplete({
            minLength: 1,
            source: async function( request, response ) {
                response(await lmod.folders(request.term));
            },
        });

        $( "#prepend_path" ).click(function (e) {
            const path = path_input.val();
            if (path != '') {
                path_input.val('')
                lmod.use([path])
                    .then(draw_modulepath_dialog)
                    .then(refresh_module_ui);
            }
        });
        $( "#append_path" ).click(async function(e) {
            const path = path_input.val();
            if (path != '') {
                path_input.val('')
                lmod.use([path], true)
                    .then(draw_modulepath_dialog)
                    .then(refresh_module_ui);
            }
        });

        var header = $('<div/>')
            .addClass("list_header")
            .addClass("row")
            .appendTo(list);

        var divheader = $('<div/>')
            .addClass("col-sm-8")
            .html("List of paths (decreasing order of priority)")
            .appendTo(header);

        paths.map((item, index) => {
            var row = $('<div/>')
                .addClass("list_item")
                .addClass("row")
                .appendTo(list);

            var div = $("<div/>")
                .addClass("col-md-12")
                .appendTo(row);

            var span = $("<span/>")
                .addClass("item_name")
                .html(`${index+1}. `)
                .appendTo(div);

            var link = $("<a/>")
                .attr("href", "#path_input")
                .click(function (e) {
                    path_input.val(item);
                })
                .html(item)
                .appendTo(span);

            var divButton = $('<div/>')
                .addClass('item_buttons')
                .addClass('pull-right')
                .appendTo(div);

            var button = $('<button/>')
                .addClass('btn')
                .addClass('btn-danger')
                .addClass('btn-xs')
                .attr("title", "Remove from MODULEPATH")
                .html('<i class="fa fa-trash-o" aria-hidden="true"></i>')
                .click(e => lmod.unuse([item])
                    .then(draw_modulepath_dialog)
                    .then(refresh_module_ui)
                )
                .appendTo(divButton);
        })
    }

    function edit_paths(event) {
        var d = dialog.modal({
            title: "Edit MODULEPATH",
            body: modulepath_dialog_body,
            keyboard_manager: this.keyboard_manager,
            default_button: "Close",
            buttons : {
                "Close": {}
            },
            open : async function () {
                await draw_modulepath_dialog();
            }
        });
    }

    function save_collection(event) {
        var d = dialog.modal({
            title: "Save Collection",
            body: save_dialog_body,
            keyboard_manager: this.keyboard_manager,
            default_button: "Cancel",
            buttons : {
                "Cancel": {},
                "Save": {
                    class: "btn-primary",
                    click: function () {
                        var name = d.find('input').val();
                        lmod.save(name ? name : 'default').then(refresh_restore_list);
                    }
                }
            },
            open : function () {
                d.find('input[type="text"]').keydown(function (event) {
                    if (event.which === keyboard.keycodes.enter) {
                        d.find('.btn-primary').first().click();
                        return false;
                    }
                });
                d.find('input[type="text"]').focus().select();
            }
        });
    }

    async function refresh_restore_list() {
        const values = await lmod.savelist();
        values.push('system');
        const list = $("#restore-menu");
        list.find('#restore-header').nextAll().remove();
        values.map(item => {
            let li = $('<li>')
                .append($('<a>', {'href': '#', "text" : item}))
                .attr("title", `Restore collection "${item}"`)
                .click(e => lmod.restore(item).then(refresh_module_ui));
            list.append(li);
        })
    }

    async function refresh_module_ui() {
        const show_hidden = $("#show_hidden")[0].checked;
        const avail_set = new Set(await lmod.avail());
        const modulelist = await lmod.list(show_hidden);
        $("#list_header").nextAll().remove();
        const list = $("#lmod_list");

        modulelist.map(item => {
            let li = lmod_list_line.clone();
            li.find('a').text(item).click(e => show_module(item));
            li.find('#reload').click(e => lmod.load([item]).then(refresh_module_ui));
            li.find('#unload').click(e => lmod.unload([item]).then(refresh_module_ui));
            list.append(li);
            avail_set.delete(item)
        });

        refresh_kernel_menu(modulelist);
        search_source = Array.from(avail_set);
    }

    function refresh_kernel_menu(modulelist) {
        $('[id^="kernel-"]').remove();
        IPython.new_notebook_widget.request_kernelspecs()

        let menu = $('.tree-buttons').find('.dropdown-menu');

        for (let server_key in server_proxy_infos) {
            let is_enabled = modulelist.some(module => { return module.toLowerCase().includes(server_key) });
            if (is_enabled) {
                if(!server_proxy_launcher.hasOwnProperty(server_key)) {
                    menu.append(server_proxy_infos[server_key]);
                    server_proxy_launcher[server_key] = $('.new-' + server_key);
                }
            } else if (server_key in server_proxy_launcher) {
                server_proxy_launcher[server_key].remove();
                delete server_proxy_launcher[server_key];
            }
        }
    }

    async function show_module(module) {
        let data = await lmod.show(module);
        let datalist = data.split('\n');
        let textarea = $('<pre/>').text($.trim(datalist.slice(3).join('\n')));
        let dialogform = $('<div/>').append(textarea);
        let path = datalist[1].slice(0, -1);
        dialog.modal({
            title: path,
            body: dialogform,
            default_button: "Ok",
            buttons : {
                "Ok" : {}
            }
        });
    }

    function split( val ) {
      return val.split( /,\s*/ );
    }
    function extractLast( term ) {
      return split( term ).pop();
    }

    async function setup_proxy_infos() {
        const response = await fetch(base_url + 'server-proxy/servers-info');
        if (!response.ok) {
            console.log('jupyter-lmod: could not communicate with jupyter-server-proxy API.');
            return;
        }
        const data = await response.json();

        let launcher_pins = [];
        const pin_response = await fetch(base_url + 'lmod/launcher-pins');
        if (response.ok) {
          launcher_pins = (await pin_response.json()).launcher_pins;
        } else {
          console.log('jupyter-lmod: could not communicate with jupyter-lmod API.');
        }

        let menu = $('.tree-buttons').find('.dropdown-menu');
        if (data.server_processes.length > 0) {
            /* add a divider to kernel menu */
            let divider = $('<li>').attr('role', 'presentation').addClass('divider');
            menu.append(divider);
        }

        for (let server_process of data.server_processes) {
            /* create our list item */
            let entry_container = $('<li>')
                .attr('role', 'presentation')
                .addClass('new-' + server_process.name);

            /* create our list item's link */
            let entry_link = $('<a>')
                .attr('role', 'menuitem')
                .attr('tabindex', '-1')
                .attr('href', base_url + server_process.launcher_entry.path_info)
                .attr('target', '_blank')
                .text(server_process.launcher_entry.title);

            entry_container.append(entry_link);
            if (launcher_pins.includes(server_process.name.toLowerCase())) {
                menu.append(entry_container);
            } else {
                server_proxy_infos[server_process.name] = entry_container;
            }
        }
    }

    function load() {
        if (!IPython.notebook_list) return;
        $(".tab-content").append(lmod_tab_html);
        $("#edit-button").click(edit_paths);
        $("#save-collection").click(save_collection);
        $("#tabs").append(
            $('<li>')
            .append(
                $('<a>')
                .attr('href', '#lmod')
                .attr('data-toggle', 'tab')
                .text('Softwares')
                .click(function (e) {
                    window.history.pushState(null, null, '#lmod');
                })
            )
        );
        $( "#modules" )
        // don't navigate away from the field on tab when selecting an item
        .on( "keydown", function( event ) {
            if ( event.keyCode === $.ui.keyCode.TAB &&
                $( this ).autocomplete( "instance" ).menu.active ) {
              event.preventDefault();
            }
        })
        .on('keyup', function (event) {
            if (event.keyCode == $.ui.keyCode.ENTER) {
                var modules = split($.trim(event.target.value));
                modules.pop();

                lmod.load(modules).then(refresh_module_ui);
                event.target.value = "";
            }
        })
        .autocomplete({
            minLength: 0,
            source: function( request, response ) {
              // delegate back to autocomplete, but extract the last term
              response( $.ui.autocomplete.filter(
                search_source, extractLast( request.term ) ) );
            },
            focus: function() {
              // prevent value inserted on focus
              return false;
            },
            select: function( event, ui ) {
              var terms = split( this.value );
              // remove the current input
              terms.pop();
              // add the selected item
              terms.push( ui.item.value );
              // add placeholder to get the comma-and-space at the end
              terms.push( "" );
              this.value = terms.join( ", " );
              return false;
            }
        });

        const show_hidden_checkbox = $("#show_hidden");
        const hidden_module_callback = function() {
            show_hidden_checkbox[0].checked = ! show_hidden_checkbox[0].checked;
            refresh_module_ui();
        }
        show_hidden_checkbox.click(hidden_module_callback);
        $("#show_hidden_btn").click(hidden_module_callback);

        setup_proxy_infos();
        refresh_module_ui();
        refresh_restore_list();
    }
    return {
        load_ipython_extension: load
    };
});
