define(function (require) {
  require("jquery");
  require("jsrender");
  require("jquery_treetable");
  var Utils = require("data/Core/Utils");
  var Toolbar = require("data/Control/Toolbar");
  
  var TEMPLATE = '' +
'<table class="treetable">' +
'  <thead></thead>' +
'  <tbody></tbody>' +
'</table>';

  function regist_event(self, event_name) {
    self._table.on(event_name, "tbody > tr", function(event) {
      self._table.find("tr.selected").removeClass("selected");
      $(this).addClass("selected");
      var operation = self._operations[event_name];
      if (!operation) {
      	return;
      }
      operation(event);
    });
  }

  function create_control(self, template) {
    self._root.append(template);
    self._table = self._root.children("table.treetable");
    self._table.treetable();

    regist_event(self, "click");
    regist_event(self, "dblclick");
  }

  function refresh(self) {
    // header
    var thead = self._table.find("thead");
    thead.empty();
    var thead_buf = [];
    thead_buf.push("<tr>");
    for (var i = 0; i < self._columns.length; i++) {
      var column = self._columns[i];
      thead_buf.push("<th>", "<div>", column.label, "</div>", "</th>");
    }
    thead_buf.push("</tr>");
    $(thead_buf.join("")).appendTo(thead);
    if (self._header_visible) {
      thead.show();
    } else {
      thead.hide();
    }

    // row
    var tbody = self._table.find("tbody");
    tbody.empty();
    if (!self._data) {
      return;
    }
    for (var i = 0; i < self._data.length; i++) {
      var item = self._data[i];
      var buf = [];
      buf.push("<tr>");
      for (var j = 0; j < self._columns.length; j++) {
        var column = self._columns[j];
        buf.push("<td>", "<div>", item[column.name], "</div>", "</td>");
      }
      buf.push("</tr>");
      $(buf.join("")).appendTo(tbody);
    }
    self._table.treetable();
  }

  function assign_item(self, tr, item) {
    for (var i = 0; i < self._columns.length; i++) {
      var column = self._columns[i];
      var value = column.renderer ? column.renderer(item) : item[column.name];
      tr.children("td." + column.name).text(value);
    }
  }

  function TreeTable() {
    this._root = null;
    this._data = [];
    this._table = null;
    this._columns = [];
    this._header_visible = true;
    this._items = [];
    this._operations = {};
  }

  TreeTable.create_columns = function (klass) {
    console.assert(typeof assist == "undefined", "assist not undefined.");
    if (!klass) {
      return null;
    }
    var columns = [];
    var fields = klass.object_fields;
    if (!fields) {
      return columns;
    }
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (!field.column) {
        continue;
      }
      columns.push({name: field.name, label: field.label, renderer: null});
    }
    return columns;
  }

  TreeTable.prototype.init = function(selector, columns) {
    var dfd = new $.Deferred;

    this._root = $(selector);
    this._columns = columns;
    var self = this;

    // CSS
    Utils.add_css("/lib/jquery.treetable.css");
    Utils.add_css("/data/Style/TreeTable.css");
    
    // Load template data & Create form tags
    create_control(this, TEMPLATE);
    dfd.resolve();
    return dfd.promise();
  };

  TreeTable.prototype.add_operation = function(event_name, operation) {
    this._operations[event_name] = operation;
  };

  TreeTable.prototype.add_item = function(item) {
    this._data.push(item);
    refresh(this);
  };

  TreeTable.prototype.selected_item = function(item) {
    var selected_tr = this._table.find("tbody > tr.selected");
    var index = selected_tr.index();
    if (index < 0) {
      return;
    }
    if (arguments.length == 0) {
      return this._items[index];
    }
    this._items.splice(index, 1, item);
    assign_item(this, selected_tr, item);
  };

  TreeTable.prototype.selected_index = function(item) {
    var selected_tr = this._table.find("tbody > tr.selected");
    var index = selected_tr.index();
    return index;
  };

  TreeTable.prototype.delete = function(index) {
    this._data.splice(index, 1);
    refresh(this);
  };

  TreeTable.prototype.edit = function(on) {
  };

  TreeTable.prototype.backuped = function() {
  };

  TreeTable.prototype.commit = function() {
  };

  TreeTable.prototype.restore = function() {
  };

  TreeTable.prototype.columns = function(columns_) {
    this._columns = columns_;
    refresh(this);
  };

  TreeTable.prototype.header_visible = function(visible) {
    this._header_visible = visible;
    refresh(this);
  };

  TreeTable.prototype.data = function(value) {
    if (arguments.length == 0) {
      return this._data
    } else {
      this._data = !value ? [] : value;
      refresh(this);
    }
  };

  TreeTable.prototype.item = function(index, value) {
    if (arguments.length == 1) {
      return this._data[index];
    } else if (arguments.length == 2) {
      this._data[index] = value;
      refresh(this);
    } else {
      console.assert(false, "arguments = " + arguments);
    }
  };

  TreeTable.prototype.move = function(index, step) {
  	// index check
    if (index < 0 || step == 0 || index + step < 0) {
      return;
    }
    var max_index = this._data.length - 1;
    if (max_index <= 0 || max_index < index || max_index < index + step) {
      return;
    }

    var offset = step < 0 ? index + step : index;
    var count = Math.abs(step) + 1;
    var target = this._data[index];
    var start = step < 0 ? index + step : index + 1;
    var end = start + count - 1;
    var args = this._data.slice(start, end);
    if (step < 0) {
      args.splice(0, 0, offset, count, target);
    } else {
      args.splice(0, 0, offset, count);
      args.push(target);
    }
    Array.prototype.splice.apply(this._data, args);
    
    refresh(this);
  };

  TreeTable.prototype.update = function(object_id, item) {
    console.assert(object_id && Utils.UUID.test(object_id) && object_id != Utils.NULL_UUID, "object_id=" + object_id);
    if (!this._data) {
      this._data = [];
    }
    var exists = false;
    for (var i = 0; i < this._data.length; i++) {
      var tmp_item = this._data[i];
      if (tmp_item.id != object_id) {
        continue;
      }
      exists = true;
      if (!item) {
        this._data.splice(i, 1);	// remove
      } else {
        this._data[i] = item;		// update
      }
      refresh(this);
      return;
    }
    // create
    if (item) {
      this._data.push(item);
      refresh(this);
    }
  };

  return TreeTable;
});
