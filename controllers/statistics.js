'use strict';

var async = require('async');
var value_checker = require('../helper/value_checker');
var error_handler = require('../helper/error_handler');
var app = require('../app');

function waiting_list(req, res, next) {

    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //필수 정보 받기.
    var group_id = req.query.group_id;

    //빈 값이 있는지 확인.
    var checklist = [group_id];
    if(value_checker.is_empty_check(checklist)) {
        error_handler.custom_error_handler(400, 'Required value is empty!', null, next);
        return;
    }

    //음이 아닌 정수인지 확인.
    var num_check_list = [group_id];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        error_handler.custom_error_handler(400, 'GroupID must be integer format!', null, next);
        return;
    }
    
    //숫자로 형변환
    group_id = parseInt(group_id);
    
    //정보 조회 시작
    async.series([
        //그룹 접근 가능 여부 조회
        function(callback) {
            let queryStr = "SELECT * FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            let queryVal = [decoded_jwt['uid'], group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        error_handler.custom_error_handler(403, 'Only member of this group can get list of waitings!', null, next);
                        return;
                    }
                    else {
                        callback(null);
                    }
                }
            });
        },
        //그룹 메뉴 정보 조회
        function(callback) {
            let queryStr = "SELECT * FROM `menus` WHERE `group_id` = ?";
            let queryVal = [group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    callback(null, rows);
                }
            });
        },
        //대기열 조회(상태 관계없이 전부 조회하며 상태별 처리는 클라이언트에서 진행)
        function(callback) {
            let queryStr = "SELECT * FROM `waitings` WHERE `group_id` = ?";
            let queryVal = [group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    callback(null, rows);
                }
            });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, {
            menu_list: results[1],
            waitings: results[2]
        });
    });
}

function clear_waiting(req, res, next) {

    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //필수 정보 받기.
    var waiting_id = req.params.waiting_id;

    //빈 값이 있는지 확인.
    var checklist = [waiting_id];
    if(value_checker.is_empty_check(checklist)) {
        error_handler.custom_error_handler(400, 'Required value is empty!', null, next);
        return;
    }

    //음이 아닌 정수인지 확인.
    var num_check_list = [waiting_id];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        error_handler.custom_error_handler(400, 'GroupID and selective information must be integer format!', null, next);
        return;
    }
    
    //숫자로 형변환
    waiting_id = parseInt(waiting_id);
    
    //처리 상태 변경을 진행.
    async.waterfall([
        //waiting 정보를 조회
        function(callback) {
            let queryStr = "SELECT * FROM `waitings` WHERE `id` = ?";
            let queryVal = [waiting_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        error_handler.custom_error_handler(404, 'Cannot find requested waiting information!', null, next);
                        return;
                    }
                    else {
                        callback(null, rows[0]);
                    }
                }
            });
        },
        //접근 가능한 group인지 확인.
        function(waiting_data, callback) {
            let queryStr = "SELECT * FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            let queryVal = [decoded_jwt['uid'], waiting_data.group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        error_handler.custom_error_handler(403, 'Only member of this group can clear this waiting info!', null, next);
                        return;
                    }
                    else {
                        callback(null, waiting_data);
                    }
                }
            });
        },
        //Waiting 상태를 변경한다.
        function(waiting_data, callback) {
            let queryStr = "UPDATE `waitings` SET `is_served` = 1, `updatedAt` = ? WHERE `id` = ?";
            let queryVal = [new Date(), waiting_id];
            app.db_connection_write.query(queryStr, queryVal, function(err, rows, fields) {
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

exports.waiting_list = waiting_list;
exports.clear_waiting = clear_waiting;