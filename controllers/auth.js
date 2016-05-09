'use strict';

var async = require('async');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var value_checker = require('../helper/value_checker');
var error_handler = require('../helper/error_handler');
var models = require('../models');

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
            (models.user).findOne({ where: { email: email }})
                .then(function(data) {
                    //회원 정보 미존재 또는 비밀번호 오류
                    if(!data || !bcrypt.compareSync(password, data.dataValues.password)) {
                        error_handler.custom_error_handler(400, 'Wrong email or password!', null, next);
                        return;
                    }
                    //아직 활성화되지 않음
                    else if(!data.dataValues.is_active) {
                        error_handler.custom_error_handler(401, 'This account is not activated yet!', null, next);
                        return;
                    }
                    //회원 정보 존재
                    else {
                        callback(null, data.dataValues);
                    }
                })
                .catch(function(err) { callback(err) });
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
        }, value_checker.jwt_secret_key, {
            expiresIn: "12h"
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
            (models.user).find({ where: { email: email }})
                .then(function(data) {
                    //회원 정보 미존재
                    if(!data) {
                        callback(null);
                    }
                    //회원 정보 존재
                    else {
                        error_handler.custom_error_handler(400, 'Email already exists!', null, next);
                        return;
                    }
                })
                .catch(function(err) { callback(err) });
        },
        //회원정보 추가
        function(callback) {
            var newUser = (models.user).build({
                name: name,
                email: email,
                password: bcrypt.hashSync(password, bcrypt.genSaltSync(10))
            });

            newUser.save().then(function() { callback(null) }).catch(function(err) { callback(err) });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, null);
    });
}

exports.signin = signin;
exports.signup = signup;