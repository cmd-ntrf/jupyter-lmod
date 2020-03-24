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
'                        <button class="btn btn-default btn-xs" id="save-button">Save</button>',
'                    </div> ',
'                    <div class="btn-group">',
'                        <button class="dropdown-toggle btn btn-default btn-xs" id="restore-buttons" data-toggle="dropdown">',
'                            <span>Restore </span>',
'                            <span class="caret"/>',
'                        </button>',
'                        <ul class="dropdown-menu", id="restore-menu"/>',
'                    </div>',
'                </div>',
'            </div>',
'        </div>',
'    </div>',
'</div>',
    ].join('\n'));

    const lmod_list_line = $([
'<div class="list_item row">',
'   <div class="col-md-12">',
'       <a href="#lmod_list"/>',
'       <div class="item_buttons pull-right">',
'           <button class="btn btn-warning btn-xs">Unload</button>',
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

    function refresh_restore_list() {
        lmod.savelist()
        .then(values => {
            let list = $("#restore-menu").html("");
            values.map(item => {
                let li = $('<li>').append($('<a>', {'href': '#', "text" : item}))
                                  .click(e => lmod.restore(item).then(refresh_module_ui));
                list.append(li);
            })
        });
    }

    function refresh_module_ui() {
        Promise.all([lmod.avail(), lmod.list()])
        .then(values => {
            let avail_set = new Set(values[0]);
            let modulelist = values[1].sort();

            $("#list_header").nextAll().remove();
            let list = $("#lmod_list");

            modulelist.map(item => {
                let li = lmod_list_line.clone();
                li.find('a').text(item).click(e => show_module(item));
                li.find('button').click(e => lmod.unload(item).then(refresh_module_ui));
                list.append(li);
                avail_set.delete(item)
            });

            refresh_kernel_menu(modulelist);

            search_source = Array.from(avail_set);
        });
    }

    function refresh_kernel_menu(modulelist) {
        $('[id^="kernel-"]').remove();
        IPython.new_notebook_widget.request_kernelspecs()
        if (modulelist.some(module => { return module.toLowerCase().includes("rstudio") })) {
            $('a:contains("RStudio Session")').attr("href", base_url + 'rstudio/');
            $("li.new-rstudio").removeClass("disabled");
        } else {
            $("li.new-rstudio").addClass("disabled");
            $('a:contains("RStudio Session")').removeAttr("href");
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

    function load() {
        if (!IPython.notebook_list) return;
        $(".tab-content").append(lmod_tab_html);
        $("#save-button").click(save_collection);
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

        refresh_module_ui();
        refresh_restore_list();
    }
    return {
        load_ipython_extension: load
    };
});
