define(function(require) {
    var $ = require('jquery');
    var IPython = require('base/js/namespace');
    var utils = require('base/js/utils');
    var _ = require('underscore');
    // var modulelist = require('./modulelist');

    var lmod_tab_html = $([
    '<div id="lmod" class="tab-pane">',
    '  <div id="lmod_toolbar" class="row list_toolbar">',
    '    <div class="col-sm-8 no-padding">',
    '      <span id="running_list_info">Currently loaded softwares</span>',
    '    </div>',
    '    <div class="col-sm-4 no-padding tree-buttons">',
    '      <span id="lmod_buttons" class="pull-right">',
    '         <button id="refresh_lmod_list" title="Refresh software list" class="btn btn-default btn-xs"><i class="fa fa-refresh"></i></button>',
    '      </span>',
    '    </div>',
    '  </div>',
    '  <div id="lmod_list">',
    '     Place holder',
    '  </div>',
    '</div>'
    ].join('\n'));

    var lmod_pane_html_tpl = _.template([
    '  <div class="panel-group" id="accordion" >',
    '    <div class="panel panel-default">',
    '      <div class="panel-heading">',
    '        <a data-toggle="collapse" data-target="#lmod_collapse<%= id %>" href="#">',
    '          <%= title %> ',
    '        </a>',
    '      </div>',
    '      <div id="lmod_collapse<%= id%>" class=" collapse in">',
    '        <div class="panel-body" id="lmod_list_<%= id%>">',
    '        </div>',
    '      </div>',
    '    </div>',
    '  </div>',
    ].join('\n')); 

    function refresh_view() {
        function module_change(event) {
            var checkbox = event.target;
            if (checkbox.checked) {
                $.ajax({
                    url: 'lmod/load',
                    type: "POST",
                    dataType: "json",
                    data: {"module" : checkbox.id},
                    success: function(data, textStatus, jqXHR) {
                        refresh_view()
                    }
                });
            } else {
                $.ajax({
                    url: 'lmod/unload',
                    type: "POST",
                    dataType: "json",
                    data: {"module" : checkbox.id},
                    success: function(data, textStatus, jqXHR) {
                        refresh_view()
                    }
                });
            }
        }

        // Refresh available module list
        $.ajax({
            url: 'lmod/avail/',
            type: "get",
            dataType: "json",
            success: function(data, textStatus, jqXHR) {
                $("#lmod_list").html("")
		var i = 0;
                for (var key in data) {
		    var pane = $(lmod_pane_html_tpl({"title": key, "id": i}));
		    $("#lmod_list").append(pane);
                    for (var j = 0; j < data[key].length; j++) {
              	        if ( j % 6 == 0) {
                            var row = $("<div/>", { class : 'row' });
                        }

                        var container = $("<div class='col-sm-2 no-padding'/>")

                        var checkbox = document.createElement('input');
                        checkbox.type = "checkbox";
                        checkbox.name = "module";
                        checkbox.value = data[key][j];
                        checkbox.id = data[key][j];
                        checkbox.onclick = module_change

                        var label = document.createElement('label')
                        label.htmlFor = data[key][j];
                        label.appendChild(document.createTextNode(data[key][j]));

                        container.append(checkbox);
                        container.append(" ")
                        container.append(label);

                        row.append(container);
		        if ( j % 6 == 5 || j == data[key].length - 1) {
                            row.appendTo($("#lmod_list_" + i.toString()));
			}
                    }
		    i += 1;
                }
            }
        });

        // Refresh selected list
        $.ajax({
            url: 'lmod/list/',
            type: "get",
            dataType: "json",
            success: function(data, textStatus, jqXHR) {
                for (var i = 0; i < data.length; i++) {
                    $('input[id=\'' + data[i] + '\']').attr('checked', true);
                }
            }
        });
    }

    function load() {
        if (!IPython.notebook_list) return;
        var base_url = IPython.notebook_list.base_url;
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

    }
    return {
        load_ipython_extension: load
    };
});
