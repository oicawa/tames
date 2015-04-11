define(function (require) { 
  require("jquery");
  require("jsrender");
  var Utils = require("core/Utils");
  return function () {
  	var _root = null;
    var _template = null;
    var _instance = this;

    function create_control(field) {
      var html = _template.render(field);
      _root.append(html);
    }

    this.init = function(selector, field) {
      // Set member fields
      _root = $(selector);
      if (0 < _root.children()) {
        return;
      }

      // Load template data & Create form tags
      Utils.add_css("/controls/Text/Text.css");
      Utils.get_control_template("Text", function(response) { _template = $.templates(response); })
      .then(function() {
        create_control(field);
      });
    };

    this.data = function(value) {
      if (arguments.length == 0) {
        return _root.find("input").val();
      } else {
        _root.find("input").val(value);
      }
    };
  }; 
}); 
