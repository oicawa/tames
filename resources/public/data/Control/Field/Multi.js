define(function (require) { 
  require("jquery");
  require("w2ui");
  var Utils = require("data/Core/Utils");
  var Dialog = require("data/Core/Dialog");
  var Inherits = require("data/Core/Inherits");
  var Toolbar = require("data/Control/Toolbar");
  var Grid = require("data/Control/Grid");
  var Detail = require("data/Control/Detail");
  var Field = require("data/Control/Field/Field");
  
  var TEMPLATE = '' +
'<div class="toolbar" style="display:none;"></div>' +
'<div class="records"></div>' +
'<div class="dialog">' +
'  <div class="detail"></div>' +
'</div>';
  
  var default_toolbar = {
    "operations" : Utils.CLASS_ID,
    "items" : [
      { "name": "add",    "caption": "Add",    "description": "Add new field",               "operation": "add" },
      { "name": "edit",   "caption": "Edit",   "description": "Edit field",                  "operation": "edit" },
      { "name": "delete", "caption": "Delete", "description": "Delete field",                "operation": "delete" },
      { "name": "up",     "caption": "Up",     "description": "Move upward selected item",   "operation": "up" },
      { "name": "down",   "caption": "Down",   "description": "Move downward selected item", "operation": "down" }
    ]
  };

  function Multi() {
    Field.call(this, "data/Control/Field", "Multi");
    this._toolbar = null;
    this._grid = null;
    this._detail = null;
    this._dialog = null;
    this._data = null;
    this._backuped = null;
  };
  Inherits(Multi, Field);
  
  Multi.prototype.init = function(selector, field, assist) {
    var dfd = new $.Deferred;
    var root = $(selector);
    if (0 < root.children()) {
      dfd.resolve();
      return dfd.promise();
    }

    // Load template data & Create form tags
    var template = $.templates(TEMPLATE);
    var class_ = null;
    var self = this;
    $.when(
      Utils.get_data(Utils.CLASS_ID, field.datatype.class, function (data) { class_ = data; })
    ).always(function() {
      var html = template.render(field);
      root.append(html);
      
      // Create controls
      self._toolbar = new Toolbar();
      self._grid = new Grid();
      self._detail = new Detail();
      self._dialog = new Dialog();

      var toolbar = !assist ? default_toolbar : (!assist.toolbar ? default_toolbar : assist.toolbar);

      var columns = Grid.create_columns(class_);

      $.when(
        self._toolbar.init(selector + " > div.toolbar", toolbar),
        self._grid.init(selector + " > div.records", columns, 'height:300px;'),
        self._detail.init(selector + " > div.dialog > div.detail", class_)
        .then(function () {
          self._detail.visible(true);
          self._detail.edit(true);
          return self._dialog.init(selector + " > div.dialog", { title: class_.label, selector : root, buttons: [{caption: "OK"}, {caption:"Cancel"}]});
        })
      ).always(function() {
        self._toolbar.bind("add", function(event) {
          self._detail.data(null);
          self._dialog.show();
        });
        self._toolbar.bind("edit", function(event) {
          var selection = self._grid.selection();
          if (selection.length != 1) {
            w2alert("Select one item.");
            return;
          }
          var index = selection[0];
          var data = self._grid.data()[index];
          self._detail.data(data);
          self._dialog.show();
        });
        self._toolbar.bind("delete", function(event) {
          var selection = self._grid.selection();
          if (selection.length == 0) {
            w2alert("Select one or more items.");
            return;
          }
          w2confirm("Delete?")
          .yes(function () {
            self._grid.delete(selection);
            self._grid.refresh();
          });
        });
        self._toolbar.bind("up", function(event) {
          var message = "Select one item. (without 1st)";
          var selection = self._grid.selection();
          if (selection.length != 1) {
            w2alert(message);
            return;
          }
          var index = selection[0];
          if (index == 0) {
            w2alert(message);
            return;
          }
          self._grid.move(index, -1);
          self._grid.refresh();
          self._grid.select(index - 1);
        });
        self._toolbar.bind("down", function(event) {
          var message = "Select one item. (without last)";
          var selection = self._grid.selection();
          if (selection.length == 0) {
            w2alert(message);
            return;
          }
          var index = selection[0];
          if (index == self._grid.data().length - 1) {
            w2alert(message);
            return;
          }
          self._grid.move(index, 1);
          self._grid.refresh();
          self._grid.select(index + 1);
        });
        self._dialog.bind("OK", function(event) {
          var data = self._detail.data();
          if (self._detail.is_new()) {
            self._grid.add(data);
          } else {
            var index = self._grid.selection()[0];
            self._grid.item(index, data);
          }
          self._dialog.close();
          self._grid.refresh();
        });
        self._dialog.bind("Cancel", function(event) {
          self._dialog.close();
        });
        dfd.resolve();
      });
    });
    return dfd.promise();
  };

  Multi.prototype.backuped = function() {
    return this._backuped;
  };

  Multi.prototype.commit = function() {
    this._backuped = this._grid.data();
  };

  Multi.prototype.restore = function() {
    this._grid.data(this._backuped);
  };

  Multi.prototype.edit = function(on) {
    this._toolbar.visible(on);
  };

  Multi.prototype.data = function(values) {
    if (arguments.length == 0) {
      return this._grid.data();
    } else {
      this._grid.data(values);
      this._backuped = values;
    }
  };
  
  Multi.prototype.refresh = function(on) {
    this._grid.refresh();
  };

  return Multi;
}); 