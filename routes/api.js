'use strict';

var express = require('express');
var router = express.Router();

var auth = require('../controllers/auth');
var group = require('../controllers/group');
var menu = require('../controllers/menu');
var order = require('../controllers/order');
var statistics = require('../controllers/statistics');

//로그인, 로그아웃 및 회원가입과 관련된 Routes.
router.post('/auth/signup', auth.signup);
router.post('/auth/signin', auth.signin);

//그룹과 관련된 Routes.
router.post('/group/create', group.create);
router.get('/group/info/:group_id', group.info);
router.post('/group/join', group.join);
router.post('/group/left', group.left);
router.get('/group/list', group.list);
router.get('/group/members', group.members);

//메뉴와 관련된 Routes.
router.post('/menu/create', menu.create);
router.post('/menu/update/:menu_id', menu.update);
router.get('/menu/list', menu.list);

//주문과 관련된 Routes.
router.post('/order/request', order.request);
router.post('/order/confirm/:order_id', order.confirm);
router.get('/order/list', order.list);

//통계와 관련된 Routes.
router.get('/statistics/queue', statistics.queue);
router.post('/statistics/clear_waiting/:waiting_id', statistics.clearWaiting);

//해당하는 API가 없을 경우 404 Response.
router.all('*', function(req, res, next) {
  var custom_err = new Error('Requested API does not exists!');
  custom_err.status = 404;
  next(custom_err);
});

module.exports = router;
