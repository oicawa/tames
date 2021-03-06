define(function (require) {
  require("jquery");
  var app = require("core/app");
  var Utils = require("core/Utils");
  var Uuid = require("core/Uuid");
  var Class = require("core/Class");
  var Storage = require("core/Storage");
  var Connector = require("core/Connector");
  var Contents = require("core/Contents");
  var Locale = require("core/Locale");
  var Toolbar = require("core/Control/Toolbar");
  var Detail = require("core/Control/Detail");
  var Tabs = require("core/Control/Tabs");
  var Menu = require("core/Control/Menu");
  var Dialog = require("core/Dialog");
  var Action = require("core/Action");
  var Css = require("core/Css");

  var TEMPLATE = '' +
'<div class="detailview-panel">' +
'  <div class="object-operations"></div>' +
'  <div class="object-detail"></div>' +
'</div>';

  function edit_toolbar(toolbar, on) {
    //var READING = ["edit", "delete"];
    //var WRITING = ["save", "cancel"];
    //toolbar.show.apply(toolbar, on ? WRITING : READING);
    //toolbar.hide.apply(toolbar, on ? READING : WRITING);
    //toolbar.refresh();
    if (on) {
      toolbar.hide("edit");
      toolbar.hide("delete");
      toolbar.show("save");
      toolbar.show("cancel");
    } else {
      toolbar.show("edit");
      toolbar.show("delete");
      toolbar.hide("save");
      toolbar.hide("cancel");
    }
  };
  
  function get_files(fields, data) {
    var files_fields = fields.filter(function(field, index) {
      var attachments = [
        "748189ad-ce16-43f6-ae2a-fa48e5ec4a39", // Files
        "4ee20d87-b73d-40a7-a521-170593ac2512"  // Images
      ];
      return attachments.some(function (id) {
        return field.datatype.id == id;
      });
    });
    var files = {};
    for (var i = 0; i < files_fields.length; i++) {
      var field = files_fields[i];
      var added = data[field.name].added;
      for (var key in added) {
        files[key] = added[key];
      }
    }
    return files;
  };

  function DetailView () {
    this._class_id = null;
    this._object_id = null;
    this._class = null;
    this._object = null;
    this._renderer = null;
    this._toolbar = null;
    this._detail = null;
  }
  
  DetailView.id = "a9bc6cc7-e6fc-4b19-8c7e-468bc2922f25";
  
  DetailView.edit = function (event) {
    var view = event.item.context;
    view.detail().edit(true);
    view.detail().refresh();
    edit_toolbar(view.toolbar(), true);
  };
  
  DetailView.delete = function (event) {
    var item = event.item;
    var entry_props = !item.function_entry ? null : item.function_entry.properties;
    
    var message = !entry_props ? "Do you want to delete?" : Locale.translate(entry_props.confirm_message);
    Dialog.confirm(message, item.text)
    .yes(function() {
      var view = event.item.context;
      var objects = null;
      Storage.delete(view._class_id, view._object_id)
      .done(function() {
        app.contents().tabs().broadcast(view._class_id, view._object_id, null);
        app.contents().tabs().remove(view._class.options.properties.detail_view.id, view._class_id, view._object_id);
        var message = !entry_props ? "Deleted" : Locale.translate(entry_props.deleted_message);
        Dialog.show(message, item.text);
      })
      .fail(function(jqXHR, text_status, error_thrown) {
        var message = !entry_props ? "Failed to delete." : Locale.translate(entry_props.deleted_failed_message);
        if (jqXHR.status == 410) {
          Dialog.show(message, item.text);
          console.log("[Delete] This item (or Class) has already been deleted by other user.Closing this tab.");
          app.contents().tabs().remove(view._class.options.properties.detail_view.id, view._class_id, view._object_id);
        } else {
          Dialog.show(message, item.text);
        }
      });
    });
  };

  DetailView.save = function (event) {
    var item = event.item;
    var entry_props = !item.function_entry ? null : item.function_entry.properties;
    
    var view = item.context;
    var detail = view.detail();
    var data = detail.data();
    var object = null;

    // Get field information
    var fields = detail._fields;
    var key_field_names = fields.filter(function(field, index) { return !(!field.key); })
                                .map(function(field){ return field.name; });
    key_field_names.push("id");
    console.assert(0 < key_field_names.length, key_field_names);
    var key_field_name = key_field_names[0];
    var files = get_files(fields, data);
    
    if (detail.is_new()) {
      var suffix = view._is_preset ? view._object.id : null;
      Storage.create(view._class.id, data, files)
      .done(function(object) {
        edit_toolbar(view.toolbar(), false);
        var new_object_id = object[key_field_name];
        view._object_id = new_object_id;
        detail.data(object);
        detail.edit(false);
        detail.commit();
        self._is_preset = false;
        detail.refresh();
        (new Class(view._class)).renderer()
        .done(function (renderer) {
          var label = renderer(object);
          var view_id = view._class.options.properties.detail_view.id;
          app.contents().tabs().change(view_id, view._class.id, Uuid.NULL, suffix, new_object_id, label);
          app.contents().tabs().broadcast(view._class.id, new_object_id, object);
          var message = !entry_props ? "Created" : Locale.translate(entry_props.created_message);
          Dialog.show(message, item.text);
        });
      })
      .fail(function(jqXHR, text_status, error_thrown) {
        var message = !entry_props ? "Failed to create" : Locale.translate(entry_props.created_failed_message);
        if (jqXHR.status == 410) {
          Dialog.show(message, item.text);
          console.log("[Save] The Class of this item has already been deleted by other user. Closing this tab.");
          app.contents().tabs().remove(view._class.options.properties.detail_view.id, view._class.id, Uuid.NULL);
        } else {
          Dialog.show(message, item.text);
        }
      });
    } else {
      if (!data[key_field_name]) {
        data[key_field_name] = view._object_id;
      }
      Storage.update(view._class.id, data[key_field_name], data, files)
      .done(function(object) {
        edit_toolbar(view.toolbar(), false);
        detail.edit(false);
        detail.commit();
        detail.refresh();
        (new Class(view._class)).renderer()
        .done(function (renderer) {
          var label = renderer(data);
          app.contents().tabs().label(view._class.options.properties.detail_view.id, view._class.id, view._object_id, label);
          app.contents().tabs().broadcast(view._class.id, view._object_id, data);
          var message = !entry_props ? "Updated" : Locale.translate(entry_props.updated_message);
          Dialog.show(message, item.text);
        });
      })
      .fail(function(jqXHR, text_status, error_thrown) {
        var message = !entry_props ? "Failed to update" : Locale.translate(entry_props.updated_failed_message);
        if (jqXHR.status == 410) {
          Dialog.show(message, item.text);
          console.log("[Save] This item (or Class) has already been deleted by other user. Closing this tab.");
          app.contents().tabs().remove(view._class.options.properties.detail_view.id, view._class.id, view._object_id);
        } else {
          Dialog.show(message, item.text);
        }
      });
    }
  };
  
  DetailView.cancel = function (event) {
    var item = event.item;
    var entry = item.function_entry;
    var message = "Do you want to cancel the current editing?";
    if (entry && entry.properties && entry.properties.confirm_message) {
      message = Locale.translate(entry.properties.confirm_message);
    }
    Dialog.confirm(message, item.text)
    .yes(function() {
      var view = event.item.context;
      
      if (view.is_new()) {
        app.contents().tabs().broadcast(view._class_id, view._object_id, null);
        app.contents().tabs().remove(view._class.options.properties.detail_view.id, view._class_id, view._object_id);
        return;
      }
      
      edit_toolbar(view.toolbar(), false);
      var detail = view.detail();
      detail.restore();
      detail.edit(false);
      detail.refresh();
    });
  };

  DetailView.prototype.detail = function () {
    return this._detail;
  };
  
  DetailView.prototype.toolbar = function () {
    return this._toolbar;
  };

  function update_self_data(self, keys) {
    var target = false;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key.class_id != self._class_id) {
        continue;
      }
      if (key.object_id != self._object_id) {
        continue;
      }
      target = true;
      break;
    }

    if (!target) {
      return;
    }

    Storage.read(self._class_id, self._object_id)
    .done(function (data) {
      self._object = data;
      self._detail.data(self._object);
      self.refresh();
    });
  }
  
  DetailView.prototype.update = function (keys) {
    update_self_data(this, keys);
    this._detail.update(keys);
  };
  
  DetailView.prototype.refresh = function () {
    this._detail.refresh();
  };

  DetailView.prototype.caption = function () {
    if (!this.is_new()) {
      var caption = this._renderer(this._object);
      return caption;
    }
    if (this._is_preset) {
      var caption = this._renderer(this._object);
      return "[Copy] " + caption;
    }
    return "[New] " + Locale.translate(this._class.label);
  };

  DetailView.prototype.is_new = function () {
    return this._detail.is_new();
  };

  DetailView.prototype.init = function (selector, class_id, object_id, preset) {
    var dfd = new $.Deferred;

    this._class_id = class_id;
    this._object_id = object_id;
    this._is_preset = is_null_or_undefined(preset) ? false : true;
    this._toolbar = new Toolbar();
    this._detail = new Detail();
    var view = $(selector);
    var basic_assist = null;
    var custom_assist = null;
    var object = null;
    var self = this;
    
    var toolbar_selector = selector + "> div.detailview-panel > div.object-operations";
    var detail_selector = selector + "> div.detailview-panel > div.object-detail";
    
    function get_object_data(self, class_id_, object_id_) {
      if (object_id_ == Uuid.NULL) {
        console.log("Didn't call Storage.read method to get object data.");
        if (self._is_preset) {
          self._object = preset;
        }
        var dfd = new $.Deferred;
        dfd.resolve();
        return dfd.promise();
      }
      return Storage.read(class_id_, object_id_).done(function (data) { self._object = data; });
    }
    
    $.when(
      Css.load("core/Control/View/DetailView.css"),
      Storage.read(Class.CLASS_ID, class_id).done(function (data) { self._class = data; }),
      get_object_data(self, class_id, object_id)
    )
    .then(function() {
      return (new Class(self._class)).renderer().done(function (renderer) { self._renderer = renderer; });
    })
    .then(function() {
      view.append(TEMPLATE);
    })
    .then(function() {
      return self._toolbar.init(toolbar_selector);
    })
    .then(function() {
      var src_items = Utils.get_as_json(null, function() { return self._class.options.properties.detail_view.properties.toolbar_items; });
      if (!src_items)
        return;
      return Menu.convert(src_items, self).done(function(dst_items) { self._toolbar.items(dst_items); });
    })
    .then(function() {
      return self._detail.init(detail_selector, self._class.object_fields, basic_assist, custom_assist);
    }).then(function() {
      self._detail.visible(true);
      if (self._object_id == Uuid.NULL) {
        edit_toolbar(self._toolbar, true);
        self._detail.edit(true);
        if (self._is_preset) {
          self._detail.data(self._object, self._is_preset);
        }
      } else {
        edit_toolbar(self._toolbar, false);
        self._detail.edit(false);
        self._detail.data(self._object);
      }
      self._toolbar.visible(true);
      self.refresh();
    })
    .then(function() {
      dfd.resolve(self);
    });
    return dfd.promise();
  };

  return DetailView;
});
