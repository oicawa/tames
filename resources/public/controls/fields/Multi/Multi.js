define(function (require) { 
  require("jquery");
  require("jsrender");
  var Utils = require("core/Utils");
  var Toolbar = require("controls/Toolbar/Toolbar");
  var Grid = require("controls/Grid/Grid");
  var Detail = require("controls/Detail/Detail");
  var Dialog = require("core/Dialog");

  function Multi() {
    this._toolbar = null;
    this._grid = null;
    this._detail = null;
    this._dialog = null;
    this._data = null;
    this._backuped = null;
  };
  
  Multi.prototype.init = function(selector, field, assist) {
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
    //Utils.add_css("/controls/fields/Multi/Multi.css");
    $.when(
      Utils.get_template("controls/fields", "Multi", function(response) { template = $.templates(response); }),
      Utils.get_data(Utils.CLASS_UUID, field.datatype.class, function (data) { class_ = data; })
    ).always(function() {
      var html = template.render(field);
      root.append(html);
      // Create controls
      self._toolbar = new Toolbar();
      self._grid = new Grid();
      self._detail = new Detail();
      self._dialog = new Dialog();

      $.when(
        self._toolbar.init(selector + " > div.toolbar", assist.toolbar),
        self._grid.init(selector + " > div.grid", null, assist.grid),
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
          var index = self._grid.selected_index();
          if (index < 0) {
            alert("Select item.");
            return;
          }
          var data = self._grid.data()[index];
          self._detail.data(data);
          self._dialog.show();
        });
        self._toolbar.bind("delete", function(event) {
          var index = self._grid.selected_index();
          if (index < 0) {
            alert("Select item.");
            return;
          }
          var res = confirm("Delete?");
          if (!res) {
            return;
          }
          self._grid.delete(index);
        });
        self._toolbar.bind("up", function(event) {
          self._dialog.show();
        });
        self._toolbar.bind("down", function(event) {
          self._dialog.show();
        });
        self._dialog.bind("OK", function(event) {
          var data = self._detail.data();
          if (self._detail.is_new()) {
            self._grid.add_item(data);
          } else {
            var index = self._grid.selected_index();
            self._grid.item(index, data);
          }
          self._dialog.close();
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
  
  return Multi;
}); 
