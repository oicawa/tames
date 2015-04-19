define(function (require) {
  require('jquery');
  require('json2');
  function get_target_path(system_name, application_name, file_name) {
    var buf = [];
    if (system_name && 0 < system_name.length) {
      buf.push(system_name);
    }
    if (application_name && 0 < application_name.length) {
      buf.push(application_name);
    }
    if (file_name && 0 < file_name.length) {
      buf.push(file_name);
    }
    return buf.join("/");
  }
  function send_function(method, url, dataType, data, func_success, func_error) {
    var dfd = new $.Deferred;
    $.ajax({
      type: method,
      url: url,
      dataType: dataType,
      cache: false,
      data: data,
      success: function (response, status) {
        if (typeof func_success == "function") {
          func_success(response);
          dfd.resolve();
        } else {
          alert("The success function is not assigned.\n(" + url + ")");
          dfd.reject();
        }
      },
      error: function (response, status) {
        if (typeof func_error == "function") {
          func_error(response, status);
        } else {
          alert("The error function is not assigned.\n(" + url + ")");
        }
        dfd.reject();
      }
    });
    return dfd.promise();
  }
  function get_function(url, dataType, func_success, func_error) {
    return send_function("GET", url, dataType, null, func_success, func_error);
  }
  function post_function(url, dataType, data, func_success, func_error) {
    return send_function("POST", url, dataType, data, func_success, func_error);
  }
  function put_function(url, dataType, data, func_success, func_error) {
    return send_function("PUT", url, dataType, data, func_success, func_error);
  }
  function delete_function(url, dataType, func_success, func_error) {
    return send_function("DELETE", url, dataType, null, func_success, func_error);
  }
  return {
    get_file: function(system_name, application_name, file_name, data_type, data, func_success, func_error) {
      var url = get_target_path(system_name, application_name, file_name);
      return get_function(url, data_type, data, func_success, func_error);
    },
    get_control_template: function(control_name, func_success, func_error) {
      var url = "/controls/" + control_name + "/" + control_name + ".html";
      return get_function(url, "html", func_success, func_error);
    },
    get_data: function(system_name, application_name, api_name, func_success, func_error) {
      var url = "/api/" + get_target_path(system_name, application_name, api_name);
      return get_function(url, "json", func_success, func_error);
    },
    post_data: function(system_name, application_name, api_name, data, func_success, func_error) {
      var url = "/api/" + get_target_path(system_name, application_name, api_name);
      return post_function(url, "json", data, func_success, func_error);
    },
    put_data: function(system_name, application_name, api_name, key, data, func_success, func_error) {
      var url = "/api/" + get_target_path(system_name, application_name, api_name) + "/" + key;
      return put_function(url, "json", data, func_success, func_error);
    },
    delete_data: function(system_name, application_name, api_name, key, func_success, func_error) {
      var url = "/api/" + get_target_path(system_name, application_name, api_name) + "/" + key;
      return delete_function(url, "json", func_success, func_error);
    },
    add_css: function(path) {
      var head = $("head");
      var css = head.children("link[href='" + path + "']");
      if (0 < css.length) {
        //console.log("[" +path + "]: already included (count=" + css.length + ")");
        return;
      }
      //head.append("<link rel='stylesheet' type='text/css' href='" + path + "?_=" + (new Date()).getTime() + "'></link>");
      head.append("<link rel='stylesheet' type='text/css' href='" + path + "' />");
    },
    get_system_name : function() {
      var path = location.pathname;
      var fields = path.split("/");
      if (fields.length <= 1) {
        return null;
      }
      var res = /^[A-Za-z_]\w*$/.test(fields[1]);
      if (!res) {
        return null;
      }
      return fields[1];
    },
    get_application_name : function() {
      var path = location.pathname;
      var fields = path.split("/");
      if (fields.length <= 2) {
        return null;
      }
      var res = /^[A-Za-z_]\w*$/.test(fields[2]);
      if (!res) {
        return null;
      }
      return fields[2];
    },
    UUID : /^[\w]{8}-[\w]{4}-[\w]{4}-[\w]{4}-[\w]{12}$/
  };
});
