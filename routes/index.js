"use strict";

var express = require('express');
var router = express.Router();
var path = require('path');
var MobileDetect = require('mobile-detect');

router.get('*', function(req, res, next) {
  var md = new MobileDetect(req.headers['user-agent']);

  if(md.phone()) {
    res.sendFile(path.join(__dirname, '../', 'public', 'mobile.html'));
  }
  else if(md.tablet()) {
    res.sendFile(path.join(__dirname, '../', 'public', 'desktop.html'));
  }
  else {
    res.sendFile(path.join(__dirname, '../', 'public', 'desktop.html'));
  }
});

module.exports = router;
