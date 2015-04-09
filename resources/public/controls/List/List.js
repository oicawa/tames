define(function (require) { 
  require("jquery");
  require("jsrender");
  var Utils = require("Utils");
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

      // Load template data & Create form tags
      Utils.add_css("controls/List/List.css");
      Utils.get_control_template("List", function(response) { _template = $.templates(response); })
      .then(function() {
        create_control(field);
      });
    };
  }; 
}); 