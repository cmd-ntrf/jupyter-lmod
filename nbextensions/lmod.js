function getCookie(name) {
    var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
    return r ? r[1] : undefined;
}

define(function(require) {
    var $ = require('jquery');
    var ui = require('jquery-ui');
    var dialog = require('base/js/dialog');
    var IPython = require('base/js/namespace');
    var base_url = IPython.notebook_list.base_url;
    var utils = require('base/js/utils');
    var _ = require('underscore');
    var moduleavail = null;
    var modulelist = null;

    var lmod_tab_html = $([
        '<div id="lmod" class="tab-pane">',
        '  <div id="lmod_toolbar" class="row list_toolbar">',
        '    <div class="col-sm-18 no-padding">',
        '      <input id="modules" class="form-control input-lg" placeholder="Search available modules..." style="width:100%">',
        '    </div>',
        '  </div>',
        '  <div class="list_container" id="lmod_list">',
        '     <div class="row list_header">Loaded module list</div>',
        '  </div>',
        '</div>'
    ].join('\n'));

    function refresh_view() {
        $.when($.get(base_url + 'lmod/avail/', {}, null, "json"),
               $.get(base_url + 'lmod/list/', {}, null, "json"),
               $.get(base_url + 'lmod/savelist/', {}, null, "json"))
        .done(function(avail, list, savelist) {
            moduleavail = new Set(avail[0]);
            modulelist = list[0];
            modulelist.map(function(item){ moduleavail.delete(item) });
            modulelist.sort();
            moduleavail = Array.from(moduleavail);
            init_list_view();
            update_list_view(modulelist);
            update_restore_view(savelist[0]);
        });
    }

    function module_change(modules, action) {
        $.ajax({
            url: base_url + 'lmod/' + action,
            type: "POST",
            dataType: "json",
            data: {"modules" : modules, "_xsrf" : getCookie("_xsrf")},
            success: refresh_view,
            traditional: true
        });
    }

    function save_collection(event) {
        var that = this;
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
                        module_change([name ? name : 'default'], 'save');
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

    function init_list_view() {
        var list = $("#lmod_list");
        list.html("");
        list.append($('<div>').addClass('row list_header')
                      .append($('<div>').addClass("col-sm-8").text("Loaded modules"))
                      .append($('<div>').addClass("col-sm-4 no-padding tree-buttons")
                                        .append($('<div>').addClass('pull-right')
                                                          .append($('<div>').attr('id', 'save-button')
                                                                            .addClass('btn-group')
                                                                            .append($('<button>').addClass('btn btn-default btn-xs')
                                                                                                 .text('Save')
                                                                                                 .click(save_collection)))
                                                          .append(" ")
                                                          .append($('<div>').attr('id', 'restore-buttons')
                                                                            .addClass('btn-group')
                                                                            .append($('<button>').addClass('dropdown-toggle btn btn-default btn-xs')
                                                                                                 .attr("data-toggle", "dropdown")
                                                                                                 .append($('<span>').text('Restore '))
                                                                                                 .append($('<span>').addClass('caret')))
                                                                            .append($('<ul>').addClass('dropdown-menu')
                                                                                             .attr('id', 'restore-menu'))))));
    }

    function update_restore_view(data) {
        var list = $("#restore-menu");
        data.map(function(item) {
            var li = $('<li>').attr('id', 'savelist-'+item)
                              .append($('<a>').attr('href', '#')
                                              .text(item))
                              .click(function(e) { module_change([item], 'restore') });
            list.append(li);
        })
    }

    function update_list_view(data) {
        var list = $("#lmod_list");

        data.map(function(item) {
            var li = $('<div>').addClass("list_item row");
            var col = $('<div>').addClass("col-md-12");
            col.append($('<a>').addClass('item_link')
                               .attr('href', "#lmod_list")
                               .text(item));
            col.append($('<div>').addClass('item_buttons pull-right')
                                 .append($('<button>').addClass('btn')
                                                      .addClass('btn-warning')
                                                      .addClass('btn-xs')
                                                      .text('Unload')
                                                      .click(function(e) { module_change(item, 'unload') })))
            li.append(col);
            list.append(li);
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
        refresh_view()
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

                module_change(modules, 'load');
                event.target.value = "";
            }
        })
        .autocomplete({
            minLength: 0,
            source: function( request, response ) {
              // delegate back to autocomplete, but extract the last term
              response( $.ui.autocomplete.filter(
                moduleavail, extractLast( request.term ) ) );
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
    }
    return {
        load_ipython_extension: load
    };
});
