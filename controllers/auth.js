'use strict';

var async = require('async');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var value_checker = require('../helper/value_checker');
var error_handler = require('../helper/error_handler');
var fs = require('fs');
var app = require('../app');

var ssl_privatekey = fs.readFileSync(__dirname + '/../ssl/server.key');

function signin(req, res, next) {

    //필수 정보 받기.
    var email = req.body.email;
    var password = req.body.password;

    //빈 값이 있는지 확인.
    var checklist = [email, password];
    if(value_checker.is_empty_check(checklist)) {
        error_handler.custom_error_handler(400, 'Required value is empty!', null, next);
        return;
    }

    //로그인 검증 시작.
    async.series([
        //회원정보 확인
        function(callback) {
            let queryStr = "SELECT * FROM `users` WHERE `email` = ?";
            let queryVal = [email];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0 || !bcrypt.compareSync(password, rows[0].password)) {
                        error_handler.custom_error_handler(400, 'Wrong email or password!', null, next);
                        return;
                    }
                    else if(rows[0].is_active != 1) {
                        error_handler.custom_error_handler(401, 'This account is not activated yet!', null, next);
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
        
        //Generate JWT
        var token = jwt.sign({
            uid: results[0].id,
            name: results[0].name,
            email: results[0].email,
            ip_address: req.ip,
            user_agent: req.headers['user-agent']
        }, ssl_privatekey, {
            expiresIn: "12h",
            algorithm: 'RS256'
        });

        error_handler.async_final(err, res, next, token);
    });
}

function signup(req, res, next) {

    //필수 정보 받기.
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;

    //빈 값이 있는지 확인.
    var checklist = [name, email, password];
    if(value_checker.is_empty_check(checklist)) {
        error_handler.custom_error_handler(400, 'Required value is empty!', null, next);
        return;
    }

    //회원가입 절차 시작
    async.series([
        //회원정보 중복검사
        function(callback) {
            let queryStr = "SELECT * FROM `users` WHERE `email` = ?";
            let queryVal = [email];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        callback(null);
                    }
                    else {
                        error_handler.custom_error_handler(400, 'Email already exists!', null, next);
                        return;
                    }
                }
            });
        },
        //회원정보 추가
        function(callback) {
            let queryStr = "INSERT INTO `users` SET ?";
            let queryVal = {
                name: name,
                email: email,
                password: bcrypt.hashSync(password, bcrypt.genSaltSync(10)),
                createdAt: new Date(),
                updatedAt: new Date()
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
        error_handler.async_final(err, res, next, null);
    });
}

exports.signin = signin;
exports.signup = signup;