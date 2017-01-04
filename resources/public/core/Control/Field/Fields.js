define(function (require) { 
  require("jquery");
  var Utils = require("core/Utils");
  var Class = require("core/Class");
  var Storage = require("core/Storage");
  var Inherits = require("core/Inherits");
  var Field = require("core/Control/Field/Field");
  var Grid = require("core/Control/Grid");
  var Finder = require("core/Control/Finder");
  
  var TEMPLATE = '' +
'<label></label>' +
'<div>' +
'  <div style="display:inline-block;color:#666;">Class:</div><div name="class"></div>' +
'  <div style="display:inline-block;color:#666;">Field:</div><div name="field"></div>' +
'</div>';

  function Fields() {
    Field.call(this, "core/Control/Field", "Fields");
    this._selector = null;
  	this._value = null;
    this._classes = null;
  	this._class = { _class:null, columns:null, finder:null, converter:null };
  	this._field = { _class:null, columns:null, finder:null, converter:null };
  }
  Inherits(Fields, Field);

  Fields.prototype.init = function(selector, field) {
    var dfd = new $.Deferred;
    // Selector & Root
    this._selector = selector;
    var root = $(selector);
    if (0 < root.children()) {
      dfd.resolve();
      return dfd.promise();
    }
    root.empty();
    root.append(TEMPLATE);
    
    // Label
    var label = root.children("label");
    label.text(field.label);
    
    // Finders
    this._class.finder = new Finder();
    this._field.finder = new Finder();

    var self = this;
    
    Storage.read(Class.CLASS_ID)
    .then(function(classes) {
      self._classes = classes;
      self._class._class = self._classes[Class.CLASS_ID];
      self._field._class = self._classes[Class.FIELD_ID];
    })
    .then(function () {
      return Grid.create_columns(self._class._class).then(function (columns) { self._class.columns = columns; });
    })
    .then(function () {
      return Grid.create_columns(self._field._class).then(function (columns) { self._field.columns = columns; });
    })
    .then(function () {
      function converter(objects) {
        return (new Class(self._class._class)).captions(objects);
      }
      return self._class.finder.init(selector + " > div[name='class']", self._class.colulmns, self._classes, "Class", false, converter);
    })
    .then(function () {
      function converter(objects) {
        return (new Class(self._field._class)).captions(objects);
      }
      return self._field.finder.init(selector + " > div[name='field']", self._field.colulmns, {}, "Field", false, converter);
    })
    .then(function () {
      self._class.finder.ok(function (recid) {
        var fields = {};
        self._classes[recid].object_fields.forEarch(function (field) {
          field.id = field.name;
          fields[field.id] = field;
        });
        self._field.finder._objects = fields;
      });
    })
    .then(function () {
      dfd.resolve();
    });
    return dfd.promise();
  };

  Fields.prototype.edit = function(on) {
    if (arguments.length == 0) {
      return this._class.finder._editting;
    } else {
      this._class.finder.edit(on);
      this._field.finder.edit(on);
    }
  };
  
  Fields.prototype.backuped = function() {
    var class_id = this._class.finder.backuped();
    var field_name = this._field.finder.backuped();
    return { "class_id" : class_id, "field_name" : field_name };
  };

  Fields.prototype.commit = function() {
    this._class.finder.commit();
    this._field.finder.commit();
  };

  Fields.prototype.restore = function() {
    this._class.finder.restore();
    this._field.finder.restore();
  };

  Fields.prototype.data = function(value) {
    if (arguments.length == 0) {
      var class_id = this._class.finder.data();
      var field_name = this._field.finder.data();
      return { "class_id" : class_id, "field_name" : field_name };
    }
    this._class.finder.data(value.class_id);
    this._field.finder.data(value.field_name);
    var objects = {};
    this._classes[value.class_id].object_fields.forEach(function (field) {
      field.id = field.name;
      objects[field.id] = field;
    });
    this._field.finder._objects = objects;
    this.refresh();
  };
  
  Fields.prototype.update = function(keys) {
  };

  Fields.prototype.refresh = function() {
    this._class.finder.refresh();
    this._field.finder.refresh();
  };

  return Fields;
});
