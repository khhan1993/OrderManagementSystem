"use strict";

var async = require('async');
var value_checker = require('../helper/value_checker');
var error_handler = require('../helper/error_handler');
var app = require('../app');

function myinfo(req, res, next) {

    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //선택적 정보를 받는다.
    var group_id = (!!req.query.group_id) ? req.query.group_id : 0;

    //음이 아닌 정수인지 확인.
    var num_check_list = [group_id];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        error_handler.custom_error_handler(400, 'GroupID must be integer format!', null, next);
        return;
    }

    //정보를 조회한다.
    async.parallel([
        //유저 정보를 조회
        function(callback) {
            let queryStr = "SELECT * FROM `users` WHERE `id` = ? AND `is_active` = 1";
            let queryVal = [decoded_jwt['uid']];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    callback(null, {
                        id: decoded_jwt['uid'],
                        name: rows[0].name,
                        email: rows[0].email,
                        createdAt: rows[0].createdAt,
                        ip : req.ip,
                        exp : new Date(parseInt(decoded_jwt['exp']) * 1000)
                    });
                }
            });
        },
        //그룹 내 주문 통계 조회
        function(callback) {
            if(group_id == 0) {
                callback(null, null);
            }
            else {
                let queryStr = "SELECT `total_price`, `approve_status`, `createdAt` FROM `orders` WHERE `user_id` = ? AND `group_id` = ?";
                let queryVal = [decoded_jwt['uid'], group_id];
                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        let total_order_count = 0;
                        let approved_order_count = 0;
                        let approved_order_price = 0;
                        let recent_order = null;
                        
                        for(var i in rows) {
                            total_order_count++;
                            recent_order = rows[i].createdAt;
                            
                            if(rows[i].approve_status == 1) {
                                approved_order_count++;
                                approved_order_price += rows[i].total_price;
                            }
                        }
                        
                        callback(null, {
                            id: group_id,
                            total_order_count: total_order_count,
                            approved_order_count: approved_order_count,
                            approved_order_price: approved_order_price,
                            recent_order: recent_order
                        });
                    }
                });
            }
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, {
            user_info: results[0],
            group_related_info: results[1]
        });
    });
}

exports.myinfo = myinfo;