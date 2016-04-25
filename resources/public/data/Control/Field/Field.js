define(function (require) { 
  require("jquery");
  var Inherits = require("data/Core/Inherits");
  var Control = require("data/Control/Control");
  
  function Field(template_path, template_name) {
    Control.call(this, null, template_path, template_name);
  }
  Inherits(Field, Control);
  
  Field.prototype.init = function(selector, field) {
  };

  Field.prototype.update = function(keys) {
  };

  Field.prototype.refresh = function() {
  };
  
  return Field;
}); 