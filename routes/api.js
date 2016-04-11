var express = require('express');
var router = express.Router();

var auth = require('../controllers/auth');
var group = require('../controllers/group');

//로그인, 로그아웃 및 회원가입과 관련된 Routes.
router.post('/auth/signup', auth.signup);
router.post('/auth/signin', auth.signin);

//그룹과 관련된 Routes.
router.post('/group/create', group.create);
router.get('/group/info/:group_id', group.info);
router.post('/group/join', group.join);
router.post('/group/left', group.left);
router.get('/group/list', group.list);

//해당하는 API가 없을 경우 404 Response.
router.all('*', function(req, res, next) {
  var custom_err = new Error('Requested API does not exists!');
  custom_err.status = 404;
  next(custom_err);
});

module.exports = router;
