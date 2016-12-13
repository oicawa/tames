define(function (require) { 
  require("jquery");
  var Utils = require("core/Utils");
  var Class = require("core/Class");
  var Storage = require("core/Storage");
  var Inherits = require("core/Inherits");
  var Detail = require("core/Control/Detail");
  var Field = require("core/Control/Field/Field");
  
  var TEMPLATE = '' +
'<label></label>' +
'<div class="complex">' +
'  <div class="detail"></div>' +
'</div>';

  function Complex() {
    Field.call(this, "core/Control/Field", "Complex");
    this._detail = null;
  };
  Inherits(Complex, Field);
  
  Complex.prototype.init = function(selector, field, assist) {
    var dfd = new $.Deferred;
    var root = $(selector);
    if (0 < root.children()) {
      dfd.resolve();
      return dfd.promise();
    }

    // Load template data & Create form tags
    var template = null;
    var class_ = null;
    var self = this;
    Storage.read(Class.CLASS_ID, field.datatype.class)
    .done(function (data) { class_ = data; })
    .always(function() {
      root.append(TEMPLATE);
      
      // Create controls
      var label = root.find("label");
      label.text(field.label);
      self._detail = new Detail();
      self._detail.init(selector + " > div.complex > div.detail", class_.object_fields)
      .always(function() {
        self._detail.visible(true);
        self._detail.edit(false);
        dfd.resolve();
      });
    });
    return dfd.promise();
  };

  Complex.prototype.backuped = function() {
    return this._backuped;
  };

  Complex.prototype.commit = function() {
    this._backuped = this._detail.data();
    this._detail.commit();
  };

  Complex.prototype.restore = function() {
    this._detail.data(this._backuped);
  };

  Complex.prototype.edit = function(on) {
    this._detail.edit(on);
  };

  Complex.prototype.data = function(values) {
    if (arguments.length == 0) {
      return this._detail.data();
    } else {
      this._detail.data(values);
    }
  };

  Complex.prototype.refresh = function() {
    this._detail.refresh();
  };
  
  return Complex;
}); 