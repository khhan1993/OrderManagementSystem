"use strict";

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var fs = require('fs');

var db_connection = mysql.createConnection({
  host     : '127.0.0.1',
  user     : 'OrderManagementSystem',
  password : 'doFG2AOcYWPKZMRQ',
  database : 'OrderManagementSystem'
});

db_connection.connect(function(err) {
  if(err) {
    console.error("Can't connect to DB server 1!");
    console.error(err);
    process.exit(-1);
  }
  else {
    console.log("DB server 1 connected...");
  }
});

var routes = require('./routes/index');
var api = require('./routes/api');

var app = express();

app.enable('trust proxy');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', api);
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.jsonp({
      state: false,
      message: err.message,
      data: err.data
    });

    //콘솔로 에러메세지 출력.
    console.log(err.status);
    console.log(err.message);
    console.log(err.stack);
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.jsonp({
    state: false,
    message: err.message,
    data: null
  });
});

exports.express = app;
exports.db_connection = db_connection;
