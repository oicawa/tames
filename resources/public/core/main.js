require.config({
  urlArgs: "version=" + (new Date()).getTime(),
  baseUrl : '/',
  
  shim: {
    'jquery': { exports: '$' },
    'json2': { deps: ['jquery'] },
    'jquery_ui': { deps: ['jquery'] },
    'jsrender': { deps: ['jquery'] },
    'jquery_splitter': { deps: ['jquery'] },
    'app': { deps: ['jquery'] }
  },
  
  paths : {
    jquery : '/lib/jquery-2.1.3',
    json2 : '/lib/json2',
    jquery_ui : '/lib/jquery-ui-1.11.4/jquery-ui',
    jsrender: '/lib/jsrender',
    jquery_splitter : '/lib/jquery.splitter/js/jquery.splitter-0.14.0',
    app : '/core/app'
  }
});

define(['app'], function (app) {
  app.init();
});