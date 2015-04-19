define(function (require) {
  require("jquery");
  require("json2");
  require("jquery_ui");
  require("jquery_splitter");
  require("jsrender");
  var Utils = require("core/Utils");
  var Toolbar = require("controls/Toolbar/Toolbar");
  var Grid = require("controls/Grid/Grid");
  var Detail = require("controls/Detail/Detail");
  return function () {
    //var _baseUrl = Utils.getBaseUrl();
    var _tabs = null;
    var _class_item = null;
    var _object_item = null;
    var _fields = [];
    var _list = null;
    var _detail = null;
    var _def_field = null;
    var _def_class = null;

    this.init = function() {
      var system_name = Utils.get_system_name();
      system_name = system_name ? system_name : "";
      var template = null;
      var config = null;
      $.when(
        Utils.get_file(system_name, "", "system.html", "html", function (data) { template = $.templates(data); }),
        Utils.get_file(system_name, "", "config.json", "json", function (data) { config = data; })
      ).always(function() {
        var root_html = template.render(config);
        $("body").append(root_html);
        
        var js_require_path = "";
        if (0 < system_name.length) {
          js_require_path += system_name + "/";
        }
        js_require_path += "application";
        require([js_require_path], function(application) {
          application["init"]();
        });
      });
    };
  };
});
