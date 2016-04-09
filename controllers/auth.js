var async = require('async');
var jwt = require('jsonwebtoken');
var app = require('../app');
var bcrypt = require('bcrypt');
var unixTime = require('unix-time');
var value_checker = require('../helper/value_checker');

var signin = function(req, res, next) {

    //필수 정보 받기.
    var email = req.body.email;
    var password = req.body.password;

    //빈 값이 있는지 확인.
    var checklist = [email, password];
    if(value_checker.is_empty_check(checklist)) {
        var custom_err = new Error('필수 정보 중에 입력되지 않은 값이 있습니다!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //인증 절차를 진행한다.
    async.series([
        //DB에서 유저를 검색한다.
        function(callback) {
            var queryStr = "SELECT * FROM `users` WHERE `email` = ?";
            var queryVal = [email];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0 || !bcrypt.compareSync(password, rows[0].password)) {
                        //이메일이 존재하는지, 그리고 비밀번호가 맞는지 확인.
                        var custom_err = new Error('존재하지 않는 email이거나 password가 일치하지 않습니다.');
                        custom_err.status = 400;
                        next(custom_err);

                        return;
                    }
                    else if(rows[0].is_active == 0) {
                        //계정 활성화 여부 확인.
                        var custom_err = new Error('아직 활성화되지 않은 계정입니다. 계정 활성화를 먼저 해 주세요.');
                        custom_err.status = 400;
                        next(custom_err);

                        return;
                    }
                    else {
                        callback(null, rows[0]);
                    }
                }
            });
        }
    ],
    function(err, results) {
        if(err) {
            var custom_err = new Error('DB Query중 에러가 발생했습니다.');
            custom_err.status = 500;
            next(custom_err);

            return;
        }
        else {
            //Generate JWT
            var token = jwt.sign({
                uid: results[0].id,
                name: results[0].name,
                email: results[0].email,
                ip_address: req.ip,
                user_agent: req.headers['user-agent']
            }, 'REPLACE_WITH_YOUR_OWN_SECRET_KEY', {
                expiresIn: "12h"
            });

            //Response with JWT
            res.jsonp({
                state: true,
                mesasge: "OK",
                data: token
            });

            return;
        }
    });
};

var signup = function(req, res, next) {

    //필수 정보 받기.
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;

    //빈 값이 있는지 확인.
    var checklist = [name, email, password];
    if(value_checker.is_empty_check(checklist)) {
        var custom_err = new Error('필수 정보 중에 입력되지 않은 값이 있습니다!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //회원가입 절차 진행.
    async.series([
        //동일한 email이 있는지 검사.
        function(callback) {
            var queryStr = "SELECT COUNT(*) AS `check_count` FROM `users` WHERE `email` = ?";
            var queryVal = [email];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows[0].check_count > 0) {
                        var custom_err = new Error('Email이 이미 존재합니다!');
                        custom_err.status = 400;
                        next(custom_err);

                        return;
                    }
                    else {
                        callback(null);
                    }
                }
            });
        },
        //If not exists, add user.
        function(callback) {
            var queryStr = "INSERT INTO `users` SET ?";
            var queryVal = {
                name: name,
                email: email,
                password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
                created_at: unixTime(new Date())
            };
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    callback(null);
                }
            });
        }
    ],
    function(err, results) {
        if(err) {
            var custom_err = new Error('DB Query중 에러가 발생했습니다.');
            custom_err.status = 500;
            next(custom_err);

            return;
        }
        else {
            res.jsonp({
                state: true,
                mesasge: "OK",
                data: null
            });

            return;
        }
    });
};

exports.signin = signin;
exports.signup = signup;