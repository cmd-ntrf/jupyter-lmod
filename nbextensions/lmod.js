define(function(require) {
    var $ = require('jquery');
    var IPython = require('base/js/namespace');
    var utils = require('base/js/utils');
    // var modulelist = require('./modulelist');

    var lmod_html = $([
    '<div id="lmod" class="tab-pane">',
    '  <div id="lmod_list">',
    '  </div>',
    '</div>'
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
                for (var key in data) {
		    var header = $("<h3/>");
		    header.append(key);
		    $("#lmod_list").append(header);
	            var table = $("<table/>");
                    for (var j = 0; j < data[key].length; j++) {
        		        if ( j % 4 == 0) {
            			    var row = $("<tr />")
            			}

                        var container = $("<td/>")

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
		                if ( j % 4 == 3 || j == data[key].length - 1) {
                            table.append(row);
			            }
                    }
	            $("#lmod_list").append(table)
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
        $(".tab-content").append(lmod_html);
        refresh_view()
        $("#tabs").append(
            $('<li>')
            .append(
                $('<a>')
                .attr('href', '#lmod')
                .attr('data-toggle', 'tab')
                .text('Lmod')
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
