define(function (require) { 
  require("jquery");
  require("jsrender");
  var Utils = require("core/Utils");
  function List() {
  	var _editor = null;
  	var _viewer = null;
    var _items = null;
    var _values = null;
  }

  List.prototype.init = function(selector, field) {
    var dfd = new $.Deferred;
    var root = $(selector);
    var template = null;
    var self = this;
    Utils.add_css("controls/fields/List/List.css");
    $.when(
      Utils.get_template("controls/fields", "List", function(response) { template = $.templates(response); }),
      Utils.get_data(field.datatype["class"], null, function(response) { self._items = response; })
    ).always(function() {
      var html = template.render(field);
      root.append(html);
      self._editor = _root.find("div.editor");
      self._viewer = _root.find("div.viewer");
      dfd.resolve();
    });
    return dfd.promise();
  };

  List.prototype.edit = function(on) {
    if (on) {
      this._editor.show();
      this._viewer.hide();
    } else {
      this._editor.hide();
      this._viewer.show();
    }
  };

  List.prototype.backuped = function() {
    return this._values;
  };

  List.prototype.commit = function() {
    var values = [];
    var options = this._editor.find("option");
    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      var selected = option.prop("selected");
      if (!selected) {
        continue;
      }
      var value = option.prop("value");
      values.push(value);
    }
    this._values = values;
  };

  List.prototype.refresh = function() {
    // editor
    // convert values (Array -> Hash)
    var flags = {};
    for (var i = 0; i < this._values.length; i++) {
      flags[_values[i]] = true;
    }
      // change selected attribute
    var options = this._editor.find("option");
    for (var i = 0; i < options.length; i++) {
      var option = options[i];
      var value = option.prop("value");
      var flag = flags[value];
      option.prop('selected', !flag ? false : true);
    }
      
    // viewer
    // convert items (Array -> Hash)
    var items_dictionary = {};
    for (var i = 0; i < this._items.length; i++) {
      var item = this._items[i];
      items_dictionary[item.uuid] = item;
    }
    // refresh viewer tags
    this._viewer.empty();
    for (var i = 0; i < this._values.length; i++) {
      var value = this._values[i];
      var item = items_dictionary[value];
      if (!item) {
        continue;
      }
      this._viewer.append("<div>" + item.label + "</div>");
    }
  };

  List.prototype.restore = function() {
    this.refresh();
  };

  List.prototype.data = function(values) {
    if (arguments.length == 0) {
      return this._values;
    } else {
      this._values = values;
    }
    this.refresh();
  };

  return List;
}); 