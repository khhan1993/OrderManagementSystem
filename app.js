"use strict";

var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var fs = require('fs');
var value_checker = require('./helper/value_checker');
var FileStreamRotator = require('file-stream-rotator');

var db_connection = mysql.createConnection({
  host     : '127.0.0.1',
  user     : 'OrderManagementSystem',
  password : 'doFG2AOcYWPKZMRQ',
  database : 'OrderManagementSystem'
});

db_connection.connect(function(err) {
  if(err) {
    console.error("Can't connect to DB server!");
    console.error(err);
    process.exit(-1);
  }
});

var routes = require('./routes/index');
var api = require('./routes/api');

var app = express();

app.enable('trust proxy');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var morganLogStream = FileStreamRotator.getStream({
  date_format: 'YYYY-MM-DD',
  filename: path.join(__dirname, 'log', 'access-%DATE%.txt'),
  frequency: 'daily',
  verbose: false
});

app.use(logger('common', {
  stream: morganLogStream
}));

app.use('/api', api);
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

var errorLogStream = FileStreamRotator.getStream({
  date_format: 'YYYY-MM-DD',
  filename: path.join(__dirname, 'log', 'error-%DATE%.txt'),
  frequency: 'daily',
  verbose: false
});

// error handlers
app.use(function(err, req, res, next) {

  res.status(err.status || 500);
  res.jsonp({
    state: false,
    message: err.message,
    data: err.data
  });
  
  var error_log_data = "";
  error_log_data += "<<Error Stack>>\n";
  error_log_data += err.stack + "\n";
  error_log_data += "<<Error Time>>\n";
  error_log_data += new Date() + "\n";
  error_log_data += "<<Request JWT>>\n";
  error_log_data += JSON.stringify(value_checker.jwt_checker(req.header('Authorization'))) + "\n";
  error_log_data += "<<Request IP>>\n";
  error_log_data += req.ip + "\n";
  error_log_data += "<<Request URL>>\n";
  error_log_data += JSON.stringify(req.url) + "\n";
  error_log_data += "<<Request Body>>\n";
  error_log_data += JSON.stringify(req.body) + "\n";
  error_log_data += "\n";

  errorLogStream.write(error_log_data);
  
});

exports.express = app;
exports.db_connection = db_connection;
