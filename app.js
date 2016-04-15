var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var fs = require('fs');

//Set DB connection info. Related information is in databse.config.json file.
var mysql_connection_info = JSON.parse(fs.readFileSync(__dirname + '/database.config.json', 'utf-8'));
var connection_obj = mysql.createConnection({
  host: mysql_connection_info.host,
  user: mysql_connection_info.user,
  password: mysql_connection_info.password,
  database: mysql_connection_info.database,
  multipleStatements: true
});

var routes = require('./routes/index');
var api = require('./routes/api');

var app = express();

// uncomment after placing your favicon in /public
app.use(function(req, res, next) {
  if (!req.secure) {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
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
      data: err.stack
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
exports.db_connection = connection_obj;
