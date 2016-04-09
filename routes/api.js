var express = require('express');
var router = express.Router();

var auth = require('../controllers/auth');

//로그인, 로그아웃 및 회원가입과 관련된 Routes.
router.post('/auth/signup', auth.signup);
router.post('/auth/signin', auth.signin);

//해당하는 API가 없을 경우 404 Response.
router.all('*', function(req, res, next) {
  var custom_err = new Error('존재하지 않는 API입니다!');
  custom_err.status = 404;
  next(custom_err);
});

module.exports = router;
