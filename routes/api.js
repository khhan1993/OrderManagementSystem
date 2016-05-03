'use strict';

var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');
var value_checker = require('../helper/value_checker');
var error_handler = require('../helper/error_handler');

var auth = require('../controllers/auth');
var group = require('../controllers/group');
var menu = require('../controllers/menu');
var order = require('../controllers/order');
var statistics = require('../controllers/statistics');


//로그인, 로그아웃 및 회원가입과 관련된 Routes.
router.post('/auth/signup', auth.signup);
router.post('/auth/signin', auth.signin);

//이 밑에 있는 API는 JWT를 필수로 요구한다.
router.all('*', function(req, res, next) {
  var decoded_jwt = null;
  try {
    decoded_jwt = jwt.verify(req.header('Authorization'), value_checker.jwt_secret_key);
  }
  catch(err) {
    error_handler.custom_error_handler(401, err.message, err, next);
    return;
  }

  next();
});

//그룹과 관련된 Routes.
router.post('/group/create', group.create);
router.get('/group/info/:group_id', group.info);
router.post('/group/join', group.join);
router.post('/group/left', group.left);
router.get('/group/list', group.list);
router.get('/group/members/:group_id', group.members);

//메뉴와 관련된 Routes.
router.post('/menu/create', menu.create);
router.post('/menu/update/:menu_id', menu.update);
router.get('/menu/list', menu.list);

//주문과 관련된 Routes.
router.post('/order/request', order.request);
router.post('/order/confirm/:order_id', order.confirm);
router.get('/order/list', order.list);

//통계와 관련된 Routes.
router.get('/statistics/waiting/list', statistics.waiting_list);
router.post('/statistics/waiting/clear/:waiting_id', statistics.clear_waiting);

//해당하는 API가 없을 경우 404 Response.
router.all('*', function(req, res, next) {
  error_handler.custom_error_handler(404, 'Requested API does not exists!', null, next);
});

module.exports = router;