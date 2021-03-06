define(function (require) {
  require("jquery");
  var app = require("core/app");
  var Utils = require("core/Utils");
  var Locale = require("core/Locale");
  var Uuid = require("core/Uuid");
  var Class = require("core/Class");
  var Storage = require("core/Storage");
  var Contents = require("core/Contents");
  var Toolbar = require("core/Control/Toolbar");
  var Grid = require("core/Control/Grid");
  var Menu = require("core/Control/Menu");
  var Action = require("core/Action");
  var Css = require("core/Css");

  var TEMPLATE = '' +
'<div class="listview-panel">' +
'  <div class="object-list">' +
'    <div><a href="#"></a></div>' +
'  </div>' +
'</div>';

  function show_tab(tab_id, label) {
    var tabTemplate = "<li class='tab-label'><a href='#{href}'>#{label}</a><span class='ui-icon ui-icon-close'>Remove Tab</span></li>"
    var id = "object-new-" + (new Date()).getTime();
    var li = $(tabTemplate.replace( /#\{href\}/g, "#" + id ).replace( /#\{label\}/g, label ) );
    var tabs = $("#object-detail-tabs");
    tabs.find(".ui-tabs-nav").append(li);
    tabs.append("<div id='" + id + "' class='tab-panel'><div class='tab-contents-panel'><div class='object_detail'></div></div></div>");
    tabs.tabs("refresh");
  }

  function ListView () {
    this._class_id = null;
    this._class = null;
    this._base_class = null;
    this._toolbar = null;
    this._grid = null;
  }
  
  ListView.id = "24c06c4d-a94e-4cca-9825-27fb26fcc9dc";
  
  ListView.create = function (event) {
    var view = event.item.context;
    var class_ = view._class;
    console.log("[New Item Opend] view_id=" + class_.options.properties.detail_view.id);
    app.contents().tabs().show_tab(class_.options.properties.detail_view.id, class_.id, Uuid.NULL);
  };
  
  function open_details(class_, grid, recids) {
    recids.forEach(function (recid) {
      var object_id = recid;
      app.contents().tabs().show_tab(class_.options.properties.detail_view.id, class_.id, object_id);
    });
  }

  ListView.open1 = function (event) {
    var view = event.item.context;
    var class_ = view._class;
    var grid = view.list();
    var recids = [event.recid];
    open_details(class_, grid, recids);
  };
  
  ListView.open = function (event) {
    var self = event.item.context;
    var class_ = self._class;
    var grid = self.list();
    var recids = grid.selection();
    open_details(class_, grid, recids);
  };

  function copy_details(class_, grid, recids) {
    recids.map(function (recid) {
      return grid.get(recid);
    }).forEach(function (object) {
      var options = { "suffix":object.id, "preset":object };
      var view_id = class_.options.properties.detail_view.id;
      app.contents().tabs().show_tab(view_id, class_.id, Uuid.NULL, options);
    });
  }

  ListView.copy = function (event) {
    var view = event.item.context;
    var class_ = view._class;
    var grid = view.list();
    var recids = grid.selection();
    copy_details(class_, grid, recids);
  };
  
  ListView.prototype.update = function (keys) {
    var target = false;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (key.class_id == this._class_id) {
        target = true;
        break;
      }
    }

    if (!target) {
      return;
    }

    var self = this;
    Storage.read(key.class_id)
    .done(function (objects) {
      self._grid.data(objects);
      self._grid.sort();
      self.refresh();
    });
  };
  
  ListView.prototype.list = function () {
    return this._grid;
  };
  
  ListView.prototype.refresh = function () {
    this._grid.refresh();
  };

  ListView.prototype.caption = function () {
    var captions = (new Class(this._base_class)).captions([this._class]);
    return captions[0];
  };

  ListView.prototype.init = function (selector, class_id, object_id) {
    var dfd = new $.Deferred;
    this._class_id = class_id;
    this._grid = new Grid();
    var view = $(selector)
    var objects = null;
    var self = this;
    var list_selector = selector + "> div.listview-panel > div.object-list";
    var options = {};
    var queries = null;
    $.when(
      Css.load("core/Control/View/ListView.css"),
      Storage.read(class_id).done(function (data) { objects = data; }),
      Storage.read(Class.CLASS_ID, class_id).done(function (data) { self._class = data; }),
      Storage.read(Class.CLASS_ID, Class.CLASS_ID).done(function (data) { self._base_class = data; })
    )
    .then(function() {
      return Class.field_map(self._class).done(function(field_map) { options.field_map = field_map; });
    })
    .then(function() {
      options.columns = Grid.columns(self._class, options.field_map);
    })
    //.then(function() {
    //  return Grid.comparers(self._class).done(function(comparers_) { options.comparers = comparers_; });
    //})
    .then(function() {
      //return Grid.queries(self._class.object_fields, self._class.list_view.properties.queries).done(function(queries_) { queries = queries_; });
      if (!self._class.options) {
        return;
      }
      if (self._class.options.id != "b72dc321-5278-42da-8738-3503ae64bcad") {
        return;
      }
      var src_queries = self._class.options.properties.list_view.properties.queries;
      return Grid.queries(self._class.object_fields, src_queries).done(function(queries_) { queries = queries_; });
    })
    .then(function() {
      view.append(TEMPLATE);
    })
    .then(function() {
      return self._grid.init(list_selector, options)
    })
    .then(function() {
      //var src_items = Utils.get_as_json(null, function() { return self._class.list_view.properties.toolbar_items; });
      if (!self._class.options) {
        return;
      }
      if (self._class.options.id != "b72dc321-5278-42da-8738-3503ae64bcad") {
        return;
      }
      var src_items = Utils.get_as_json(null, function() { return self._class.options.properties.list_view.properties.toolbar_items; });
      if (!src_items)
        return;
      return Menu.convert(src_items, self).done(function(dst_items) { self._grid.items(dst_items); });
    })
    .then(function() {
      var items = self._class.options.properties.list_view.properties.context_items;
      self._grid.context_menu(items, self);
    })
    .then(function() {
      self._grid.select_column(true);
      self._grid.toolbar(true);
      //self._grid.multi_search(true);
      self._grid.data(objects);
      self._grid.sort();
      self.refresh();
    })
    .then(function() {
      dfd.resolve(self);
    });
    return dfd.promise();
  };

  return ListView;
});
