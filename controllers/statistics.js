'use strict';

var async = require('async');
var app = require('../app');
var unixTime = require('unix-time');
var sha512 = require('sha512');
var value_checker = require('../helper/value_checker');

function queue(req, res, next) {

    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //decode 성공 여부를 확인한다. 이 API는 사용자 인증이 필요하다. 실패시 401에러처리.
    if(decoded_jwt == null) {
        let custom_err = new Error('Failed to decode JWT!');
        custom_err.status = 401;
        next(custom_err);

        return;
    }

    //필수 정보 받기.
    var group_id = req.query.group_id;

    //빈 값이 있는지 확인.
    var checklist = [group_id];
    if(value_checker.is_empty_check(checklist)) {
        let custom_err = new Error('Required value is empty!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //음이 아닌 정수인지 확인.
    var num_check_list = [group_id];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        let custom_err = new Error('GroupID and TableNum must be integer format!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //정보 조회 시작.
    async.series([
        //우선 이 그룹의 멤버인지 조회한다.
        function(callback) {
            var queryStr = "SELECT COUNT(*) AS `check_count` FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            var queryVal = [decoded_jwt['uid'], group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows[0].check_count == 0) {
                        let custom_err = new Error('Only member of this group can get information!');
                        custom_err.status = 403;
                        next(custom_err);

                        return;
                    }
                    else {
                        callback(null);
                    }
                }
            });
        },
        //이 그룹의 메뉴 정보를 받아온다.
        function(callback) {
            var queryStr = "SELECT `id`, `name` FROM `menus` WHERE `group_id` = ?";
            var queryVal = [group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    callback(null, rows);
                }
            });
        },
        //이 그룹의 주문 총액 계산을 위해 조회
        function(callback) {
            var queryStr = "SELECT `id`, `total_price` FROM `orders` WHERE `group_id` = ? AND `approve_status` = 1";
            var queryVal = [group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    callback(null, rows);
                }
            });
        },
        //대기열 조회(전부 조회, 처리는 클라이언트에서 진행)
        function(callback) {
            var queryStr = "SELECT `id`, `menu_id`, `amount`, `table_num`, `is_served` FROM `waitings` WHERE `group_id` = ?";
            var queryVal = [group_id];
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
        if(err) {
            let custom_err = new Error('Database query error!');
            custom_err.status = 500;
            next(custom_err);

            return;
        }
        else {
            res.jsonp({
                state: true,
                mesasge: "OK",
                data: {
                    menu_list: results[1],
                    order_price_list: results[2],
                    waitings: results[3]
                }
            });

            return;
        }
    });
}

function clearWaiting(req, res, next) {

    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //decode 성공 여부를 확인한다. 이 API는 사용자 인증이 필요하다. 실패시 401에러처리.
    if(decoded_jwt == null) {
        let custom_err = new Error('Failed to decode JWT!');
        custom_err.status = 401;
        next(custom_err);

        return;
    }

    //필수 정보 받기.
    var waiting_id = req.params.waiting_id;

    //빈 값이 있는지 확인.
    var checklist = [waiting_id];
    if(value_checker.is_empty_check(checklist)) {
        let custom_err = new Error('Required value is empty!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //음이 아닌 정수인지 확인.
    var num_check_list = [waiting_id];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        let custom_err = new Error('GroupID and TableNum must be integer format!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //SocketIO 때문에 추가.
    var groupId = null;

    //처리 상태 변경을 진행한다.
    async.waterfall([
        //waiting 정보를 조회한다.
        function(callback) {
            var queryStr = "SELECT * FROM `waitings` WHERE `id` = ?";
            var queryVal = [waiting_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        let custom_err = new Error('Cannot find requested WaitingID!');
                        custom_err.status = 404;
                        next(custom_err);

                        return;
                    }
                    else {
                        callback(null, rows[0]);
                    }
                }
            });
        },
        //해당 그룹에 속해있는 유저인지 검사한다.
        function(waiting_info, callback) {
            var queryStr = "SELECT COUNT(*) AS `check_count` FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            var queryVal = [decoded_jwt['uid'], waiting_info.group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows[0].check_count == 0) {
                        let custom_err = new Error('Only member of this group can modify waiting status!');
                        custom_err.status = 403;
                        next(custom_err);

                        return;
                    }
                    else {
                        groupId = waiting_info.group_id;
                        callback(null);
                    }
                }
            });
        },
        //이제 waiting 상태를 변경한다.
        function(callback) {
            var queryStr = "UPDATE `waitings` SET `is_served` = 1, `updated_at` = ? WHERE `id` = ?";
            var queryVal = [unixTime(new Date()), waiting_id];
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
            let custom_err = new Error('Database query error!');
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

            //Socket.IO를 이용하여 실시간으로 업데이트 할 수 있도록 설정함.
            var io = require('./websocket');
            io.socketEventEmitter('Group_' + groupId, 'queueEvent', null);

            return;
        }
    });
}

exports.queue = queue;
exports.clearWaiting = clearWaiting;