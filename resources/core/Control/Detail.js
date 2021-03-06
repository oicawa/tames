define(function (require) { 
  require("jquery");
  var Utils = require("core/Utils");
  var Inherits = require("core/Inherits");
  var Locale = require("core/Locale");
  var Uuid = require("core/Uuid");
  var Css = require("core/Css");
  var app = require("core/app");

  var TEMPLATE_FIELD = '<div class="w2ui-field"></div>';
  
  var TEMPLATE_FRAME = '<table class="tames-detail-frame"></table>';
  var TEMPLATE_ROW = '<tr class="tames-detail-row"></tr>';
  var TEMPLATE_CELL= '<td></td>';
  var CELL_LABEL = 'tames-detail-cell-label';
  var CELL_VALUE = 'tames-detail-cell-value';

  function get_control_assist(self, field) {
    if (!self._custom_assist) {
      return null;
    }
    if (!self._custom_assist[field.name]) {
      return null;
    }
    return self._custom_assist[field.name];
  }

  function get_control_path(self, field) {
    var datatype = field.datatype;
    var id = datatype.id;
    var primitive = app._primitives[id];
    return primitive.require_path;
  }

  function create_field(self, table_id, field) {
    var dfd = new $.Deferred;
    var control_path = get_control_path(self, field);
    if (!control_path) {
      dfd.resolve();
      return dfd.promise();
    }
    
    var label_layout = field.layout.label;
    var value_layout = field.layout.value;
    
    require([control_path], function(Control) {
      console.assert(Control, "[ERROR] constructor is undefined (control=" + control_path + ")");
      var control = new Control();
      self._controls[field.name] = control;
      try {
        var label_selector = create_cell_selector(table_id, label_layout.row.index, label_layout.column.index);
        var label_cell = $(label_selector);
        var caption = Locale.translate(field.label);
        label_cell.text(caption);
        var value_selector = create_cell_selector(table_id, value_layout.row.index, value_layout.column.index);
        control.init(value_selector, field)
        .done(function() {
          dfd.resolve();
        })
        .fail(function() {
          console.assert(false, "<<fail>> control_path=[" + control_path + "]");
          dfd.reject();
        });
      } catch (e) {
        console.assert(false, "[ERROR] field.name=" + field.name + ", control=" + control_path);
        console.assert(false, e);
      }
    });
    return dfd.promise();
  }

  function get_max_index(max_index, default_index, target) {
    if (!target) {
      target = { index : default_index, span : 1 };
      return default_index < max_index ? max_index : default_index;
    }

    // Index
    //var index = (!target.index || isNaN(target.index)) ? default_index : parseInt(target.index);
    var index = (target.index === null || target.index === "") ? default_index : parseInt(target.index);
    target.index = index;
    index = index < max_index ? max_index : index;

    // Span
    //var span = (!target.span || isNaN(target.span)) ? 1 : parseInt(target.span);
    var span = (target.span === null || target.span === "") ? 1 : parseInt(target.span);
    target.span = span;
    index = index + (1 <= span ? span - 1 : 0);

    return index;
  }

  function create_cell_selector(table_id, row_index, col_index) {
    return "#" + table_id + " > tbody > tr:eq(" + row_index + ") > td[name='c" + col_index + "']";
  }

  function erase_table_elements(fields, table_id) {
    var table = $("#" + table_id);
    var layout_pairs = fields.map(function (field) { return [ field.layout.label, field.layout.value ]; });
    var layouts = Array.prototype.concat.apply([], layout_pairs);

    function sorter(layout0, layout1) {
      // Compare row index
      var row_diff = layout0.row.index - layout1.row.index;
      if (row_diff != 0) {
        return row_diff;
      }
      
      // Compare column index
      var col_diff = layout0.column.index - layout1.column.index;
      return col_diff;
    }
    var sorted_layouts = layouts.sort(sorter).reverse();
    for (var i = 0; i < sorted_layouts.length; i++) {
      var l = sorted_layouts[i];
      var selector = create_cell_selector(table_id, l.row.index, l.column.index);
      if (1 < l.row.span) {
        $(selector).attr("rowspan", l.row.span);
      }
      if (1 < l.column.span) {
        $(selector).attr("colspan", l.column.span);
      }
      for (var row_index = l.row.index; row_index < l.row.index + l.row.span; row_index++) {
        for (var col_index = l.column.index; col_index < l.column.index + l.column.span; col_index++) {
          if (row_index == l.row.index && col_index == l.column.index) {
            continue;
          }
          var selector = create_cell_selector(table_id, row_index, col_index);
          $(selector).remove();
        }
      }
    }
  }

  function create_frame(self, selector) {
    var dfd = new $.Deferred;
    if (!self._fields) {
      dfd.resolve();
      return dfd.promise();
    }

    // Get max index of row and column
    var max_row_index = 0;
    var max_col_index = 0;
    for (var i = 0; i < self._fields.length; i++) {
      var layout = self._fields[i].layout;
      if (!layout) {
        max_row_index += (i == 0) ? 0 : 1;
        max_col_index = max_col_index < 1 ? 1 : max_col_index;
        self._fields[i].layout = {
          label : { row : { index : i, span : 1 }, column : { index : 0, span : 1 } },
          value : { row : { index : i, span : 1 }, column : { index : 1, span : 1 } }
        }
        continue;
      }

      var tmp_col_index = 0;
      
      // Label
      max_row_index = get_max_index(max_row_index, i, layout.label.row);
      tmp_col_index = get_max_index(tmp_col_index, tmp_col_index, layout.label.column);
      
      // Value
      max_row_index = get_max_index(max_row_index, i, layout.value.row);
      tmp_col_index = get_max_index(tmp_col_index, tmp_col_index + 1, layout.value.column);

      max_col_index = max_col_index < tmp_col_index ? tmp_col_index : max_col_index;
    }
    
    // Generate table
    self._root.append(TEMPLATE_FRAME);
    var table_id = Uuid.version4();
    var table = self._root.children("table.tames-detail-frame");
    table.attr("id", table_id);
    // Generate rows
    for (var row_index = 0; row_index <= max_row_index; row_index++) {
      table.append(TEMPLATE_ROW);
      var row = table.find("tr.tames-detail-row:last-child");
      // Generate columns
      for (var col_index = 0; col_index <= max_col_index; col_index++) {
        row.append(TEMPLATE_CELL);
        var cell = row.find("td:last-child");
        cell.attr("name", "c" + col_index);
      }
    }

    erase_table_elements(self._fields, table_id);

    var promises = [];
    // Assign labels & fields
    for (var i = 0; i < self._fields.length; i++) {
      promises[i] = create_field(self, table_id, self._fields[i]);
    }
    
    $.when.apply(null, promises)
    .then(function() {
      dfd.resolve();
    });
    return dfd.promise();
  }

  function get_value(control) {
    var type = control.prop("type");
    alert(control.prop("name"));
    return type == "checkbox" ? control.prop("checked") : control.val();
  }

  function set_value(control, value) {
    var type = control.prop("type");
    if (type == "checkbox") {
      control.prop("checked", value);
    } else {
      control.val(value);
    }
  }
  
  function Detail(parent) {
    this._parent = parent;
    this._root = null;
    this._fields = null;
    this._basic_assist = null;
    this._custom_assist = null;
    this._data = null;
    this._func_ok = null;
    this._root_template = null;
    this._assist_template = null;
    this._fields_template = null;
    this._controls = {};
    this._is_new = true;
    this._instance = this;
  }

  Detail.prototype.update = function(keys) {
    for (var name in this._controls) {
      var control = this._controls[name]
      control.update(keys);
    }
  };

  Detail.prototype.init = function(selector, fields, basic_assist, custom_assist) {
    var dfd = new $.Deferred;
    this._root = $(selector);
    this._root.hide();
    if (0 < this._root.children()) {
      dfd.resolve();
      return dfd.promise();
    }
    this._fields = fields;
    this._basic_assist = !basic_assist ? null : basic_assist;
    this._custom_assist = !custom_assist ? null : custom_assist;

    var self = this;
    Css.load("core/Control/Detail.css")
    .then(function () {
      return create_frame(self, selector);
    })
    .then(function() {
      dfd.resolve();
    });
    
    return dfd.promise();
  };

  Detail.prototype.visible = function(visible) {
    if (arguments.length == 0) {
      return this._root.css("display") == "none" ? false : true;
    }
    this._root.css("display", visible ? "block" : "none");
  };

  Detail.prototype.edit = function(on) {
    if (!this._fields) {
      return;
    }
    for (var i = 0; i < this._fields.length; i++) {
      var field = this._fields[i];
      var name = field.name;
      if (!this._controls[name]) {
        continue;
      }
      this._controls[name].edit((!this._is_new && !(!field.key)) ? false : on);
    }
  };

  Detail.prototype.backup = function() {
    if (!this._fields) {
      return data;
    }
    
    var data = {};
    for (var i = 0; i < this._fields.length; i++) {
      var object_field = this._fields[i];
      var name = object_field.name;
      var control = this._controls[name];
      if (!control) {
        continue;
      }
      data[name] = control.backup();
    }
    return data;
  };

  Detail.prototype.commit = function() {
    for (var i = 0; i < this._fields.length; i++) {
      var object_field = this._fields[i];
      var name = object_field.name;
      this._controls[name].commit();
    }
  };

  Detail.prototype.restore = function() {
    for (var i = 0; i < this._fields.length; i++) {
      var object_field = this._fields[i];
      var name = object_field.name;
      this._controls[name].restore();
    }
  };

  Detail.prototype.is_new = function() {
    return this._is_new;
  };

  Detail.prototype.refresh = function() {
    if (!this._fields) {
      return;
    }

    for (var i = 0; i < this._fields.length; i++) {
      var object_field = this._fields[i];
      var name = object_field.name;
      var control = this._controls[name];
      if (control)
        control.refresh();
    }
  };

  Detail.prototype.data = function(value, is_preset) {
    var data = {};

    var exist_object_fields = !this._fields ? false : true;
    if (exist_object_fields) {
      for (var i = 0; i < this._fields.length; i++) {
        var object_field = this._fields[i];
        var name = object_field.name;
        var control = this._controls[name];
        if (!control) {
          continue;
        }
        if (arguments.length == 0) {
          data[name] = control.data();
        } else {
          control.data(value ? value[name] : null);
        }
      }
    }
    
    if (arguments.length == 0) {
      return data;
    } else {
      this._is_new = (is_null_or_undefined(value) || is_preset === true) ? true : false;
    }
  };
  
  return Detail;
});
