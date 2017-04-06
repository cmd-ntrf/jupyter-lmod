define(function(require) {
    "use strict";
    var $ = require('jquery');
    var ui = require('jquery-ui');
    var dialog = require('base/js/dialog');
    var lmod_class = require('./lmod.js');
    var utils = require('base/js/utils');

    var base_url = utils.get_body_data("baseUrl");

    var lmod = new lmod_class.Lmod({'base_url' : base_url});
    var search_source = null;

    var lmod_tab_html = $([
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

    async function show_module(module) {
        var data = await lmod.show(module);
        var datalist = data.split('\n');
        var textarea = $('<pre/>').text($.trim(datalist.slice(3).join('\n')));
        var dialogform = $('<div/>').append(textarea);
        var path = datalist[1].slice(0, -1);
        dialog.modal({
            title: path,
            body: dialogform,
            default_button: "Ok",
            buttons : {
                "Ok" : {}
            }
        });
    }

    function save_collection(event) {
        var dialog_body = $('<div/>').append(
            $("<p/>").addClass("save-message")
                .text('Enter a new collection name:')
        ).append(
            $("<br/>")
        ).append(
            $('<input/>').attr('type','text').attr('size','25').addClass('form-control').attr('placeholder', 'default')
        );
        var d = dialog.modal({
            title: "Save Collection",
            body: dialog_body,
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
                /**
                 * Upon ENTER, click the OK button.
                 */
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
            var list = $("#restore-menu");
            list.html("");
            values.map(item => {
                var li = $('<li>').attr('id', 'savelist-'+item)
                                  .append($('<a>').attr('href', '#')
                                                  .text(item))
                                  .click(function(e) { lmod.restore(item).then(refresh_module_list) });
                list.append(li);
            })
        });
    }

    function refresh_module_list() {
        Promise.all([lmod.avail(), lmod.list()])
        .then(values => {
            let avail_set = new Set(values[0]);
            let modulelist = values[1];

            modulelist.map(function(item){ avail_set.delete(item) });
            modulelist.sort();
            search_source = Array.from(avail_set);

            $("#list_header").nextAll().remove();
            var list = $("#lmod_list");

            modulelist.map(function(item) {
                var li = $('<div>').addClass("list_item row");
                var col = $('<div>').addClass("col-md-12");
                col.append($('<a>').addClass('item_link')
                                   .attr('href', "#lmod_list")
                                   .text(item)
                                   .click(function(e) { show_module(item) }));
                col.append($('<div>').addClass('item_buttons pull-right')
                                     .append($('<button>').addClass('btn btn-warning btn-xs')
                                                          .text('Unload')
                                                          .click(function(e) { lmod.unload(item).then(refresh_module_list) })));
                li.append(col);
                list.append(li);
            });
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

                lmod.load(modules).then(refresh_module_list);
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

        refresh_module_list();
        refresh_restore_list();
    }
    return {
        load_ipython_extension: load
    };
});
