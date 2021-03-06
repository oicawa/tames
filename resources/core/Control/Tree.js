define(function (require) { 
  require("jquery");
  var Uuid = require("core/Uuid");

  var TEMPLATE = '<div id="{{TREE_ID}}"></div>';

  function Tree() {
    this._root = null;
    this._uuid = null;
    this._tree = null;
    this._renderers = {};
    this._data = null;
    this._converter = null;
    //this._data = {
    //  ""     : { "data" : null,   "order" : ["id-1", "id-2", "id-3"] },
    //  "id-1" : { "data" : data_1, "order" : ["id-10", "id-11", "id-11"] },
    //  "id-2" : { "data" : data_2, "order" : [] },
    //  "id-3" : { "data" : data_3, "order" : ["id-30", "id-31"] },
    //  ...
    //  ...
    //  ...
    //};
  }

  Tree.eq = function (source, condition) {
    var src_value = source[condition.field];
    if (!src_value) {
      console.log("source doesn't have [" + condition.field + "] field");
      return false;
    }
    console.log("src_value = [" + src_value + "], condition.value = [" + condition.value + "]");
    return (src_value == condition.value) ? true : false;
  };

  Tree.neq = function (source, condition) {
    var src_value = source[condition.field];
    if (!src_value) {
      console.log("source doesn't have [" + condition.field + "] field");
      return true;
    }
    console.log("src_value = [" + src_value + "], condition.value = [" + condition.value + "]");
    return (src_value != condition.value) ? true : false;
  };

  Tree.append = function (sidebar, id) {
    console.log("Tree.append() id:" + id);
  };

  Tree.insert = function (sidebar, id) {
    console.log("Tree.insert() id:" + id);
  };

  Tree.remove = function (sidebar, id) {
    console.log("Tree.remove() id:" + id);
  };

  Tree.prototype.init = function(selector, converter) {
    var dfd = new $.Deferred;
    this._uuid = Uuid.version4();
    this._converter = converter;
    var html = TEMPLATE.replace(/{{TREE_ID}}/, this._uuid);
    
    this._root = $(selector);
    this._root.append(html);
    this._menus = [
      {id:1, text:"Append", img:null, icon:null, filter:{op:"eq",  field:"img", value:"icon-folder"}, run:Tree.append },
      {id:2, text:"Remove", img:null, icon:null, filter:{op:"eq",  field:"img", value:"icon-folder"}, run:Tree.remove },
      {id:3, text:"Insert", img:null, icon:null, filter:{op:"neq", field:"img", value:"icon-folder"}, run:Tree.insert },
      {id:4, text:"Remove", img:null, icon:null, filter:{op:"neq", field:"img", value:"icon-folder"}, run:Tree.remove },
    ];
    var self = this;
    this._tree = $("#" + this._uuid);
    this._tree.on("remove", function(event) {
      delete w2ui[self._uuid];
    });
    this._tree.w2sidebar({
      name:this._uuid,
      menu:[],
      nodes:[],
      style: "height:300px;",
      onClick: function(event) {
        console.log(event.target);
      },
      onContextMenu: function(event) {
        var node = w2ui[self._uuid].get(event.target);
        w2ui[self._uuid].menu = self._menus.filter(function (menu) {
          return Tree[menu.filter.op](node, menu.filter);
        });
      },
      onMenuClick: function(event) {
        var menu = event.menuItem;
        if (!menu.run) {
          console.log("onMenuClick:[" + menu.text + "]");
          return;
        }
        menu.run(w2ui[self._uuid], event.target);
      },
      onDestroy: function(event) {
        delete w2ui[self._uuid];
      }
    });
    
    dfd.resolve();
    return dfd.promise();
  };
  
  Tree.prototype.convert = function (items) {
    var nodes = items.map(function (item) {
      var class_id = item["class_id"];
      var renderer = this._renderers[class_id];
      return { id: item["id"], text: renderer(item) };
    });
    return nodes;
  }

  Tree.prototype.add = function(parent_id, items) {
    //var nodes = this.convert(items);
    var nodes = items.map(this._converter);
    //debugger;
    if (is_null_or_undefined(parent_id)) {
      w2ui[this._uuid].add(nodes);
    } else {
      w2ui[this._uuid].add(parent_id, nodes);
    }
  };

  Tree.prototype.insert = function(parent_id, before_id, items) {
    //var nodes = this.convert(items);
    var nodes = items;
    w2ui[this._uuid].insert(parent_id, before_id, nodes);
    //w2ui[this._uuid].expand(parent_id);
  };

  Tree.prototype.remove = function(ids) {
    w2ui[this._uuid].remove.apply(w2ui[self._uuid], ids);
  };

  Tree.prototype.refresh = function(target_id) {
    //debugger;
    //var target_item = this._data[!target_id ? "" : target_id];
    //{ "data" : data, "order" : ["id-1", "id-2", "id-3"] },
    //var data = target_item["data"];
    //var order = target_item["order"];
    if (!target_id) {
      w2ui[this._uuid].refresh();
    } else {
      w2ui[this._uuid].refresh(target_id);
    }
  };

  Tree.prototype.data = function(value) {
    this._data = value;
  };
  
  Tree.prototype.update = function(keys) {
  };

  Tree.sample_backup = function(id) {
    var tree = new Tree();
    tree.init(id);
    tree.add(null, [
      //{ id: 'id-1', text: 'Item 1', img: 'icon-folder', expanded: false, group: true, nodes: [] },
      //{ id: 'id-2', text: 'Item 2', img: 'icon-folder', expanded: false, group: true, nodes: [] }
      { id: 'id-1', text: 'Item 1', img: 'icon-folder' },
      { id: 'id-2', text: 'Item 2', img: 'icon-folder' }
    ]);
    tree.insert('id-1', null, [
      { id: 'id-1-1', text: 'Item 1-1', icon: 'fa-star-empty' },
      { id: 'id-1-2', text: 'Item 1-2', icon: 'fa fa-question-circle-o' }
    ]);
    tree.insert('id-2', null, [
      { id: 'id-2-1', text: 'Item 2-1', icon: 'fa-star-empty' },
      { id: 'id-2-2', text: 'Item 2-2', icon: 'w2ui-icon-check' }
    ]);
    tree.refresh();
  }

  Tree.sample = function(id, class_, converter) {
    var tree = new Tree();
    tree.init(id, converter);
    tree.add(null, class_.object_fields);
    tree.refresh();
  }

  return Tree;
});
