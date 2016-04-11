'use strict';

var async = require('async');
var app = require('../app');
var unixTime = require('unix-time');
var sha512 = require('sha512');
var value_checker = require('../helper/value_checker');

function create(req, res, next) {

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
    var name = req.body.name;
    var price = req.body.price;
    var group_id = req.body.group_id;

    //빈 값이 있는지 확인.
    var checklist = [name, price, group_id];
    if(value_checker.is_empty_check(checklist)) {
        let custom_err = new Error('Required value is empty!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //음이 아닌 정수인지 확인.
    var num_check_list = [price, group_id];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        let custom_err = new Error('GroupID must be integer format!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }
    
    //메뉴의 추가 작업을 진행한다.
    //TODO: 멤버 전부 다 추가 가능하게 할지, 아니면 그룹 만든사람만 추가 가능하게 할지 생각해 볼 것!
    async.series([
        //우선 이 그룹의 멤버인지 여부를 먼저 확인한다.
        function(callback) {
            var queryStr = "SELECT COUNT(*) AS `check_count` FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            var queryVal = [decoded_jwt['uid'], group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows[0].check_count == 0) {
                        let custom_err = new Error('Only member of this group can add menu!');
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
        //이제 메뉴의 추가를 진행한다.
        function(callback) {
            var queryStr = "INSERT INTO `menus` SET `name` = ?, `price` = ?, `group_id` = ?, `created_at` = ?, `updated_at` = ?";
            var queryVal = [name, price, group_id, unixTime(new Date()), unixTime(new Date())];
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

            return;
        }
    });
}

function update(req, res, next) {

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
    //TODO: 가격정보를 바꿀 수 있게 할 것인가? (일단은 가능하게)
    var menu_id = req.params.menu_id;
    var price = req.body.price;
    var is_available = (!!req.body.is_available) ? "1" : "0"; //정수형태로 넣어주면 밑의 empty_check를 통과하지 못함.

    //빈 값이 있는지 확인.
    var checklist = [menu_id, price, is_available];
    if(value_checker.is_empty_check(checklist)) {
        let custom_err = new Error('Required value is empty!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //음이 아닌 정수인지 확인.
    var num_check_list = [price];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        let custom_err = new Error('GroupID must be integer format!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //메뉴 정보의 업데이트를 진행한다.
    //TODO: 멤버 전부 다 수정 가능하게 할지, 아니면 그룹 만든사람만 수정 가능하게 할지 생각해 볼 것!
    async.waterfall([
        //메뉴 정보를 가져온다.
        function(callback) {
            var queryStr = "SELECT * FROM `menus` WHERE `id` = ?";
            var queryVal = [menu_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        let custom_err = new Error('Cannot find such menu!');
                        custom_err.status = 404;
                        next(custom_err);

                        return;
                    }
                    else {
                        callback(null, rows[0].group_id);
                    }
                }
            });
        },
        //해당 그룹의 멤버인지 확인한다.
        function(group_id, callback) {
            var queryStr = "SELECT COUNT(*) AS `check_count` FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            var queryVal = [decoded_jwt['uid'], group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows[0].check_count == 0) {
                        let custom_err = new Error('Only member of this group can modify menu!');
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
        //이제 메뉴 정보를 수정한다.
        function(callback) {
            var queryStr = "UPDATE `menus` SET `price` = ?, `is_available` = ?, `updated_at` = ? WHERE `id` = ?";
            var queryVal = [price, is_available, unixTime(new Date()), menu_id];
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

            return;
        }
    });
}

function list(req, res, next) {

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
        let custom_err = new Error('GroupID must be integer format!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //메뉴 리스트 조회.
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
                        let custom_err = new Error('Only member of this group can get list of menu!');
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
        //이제 리스트를 조회한다.
        function(callback) {
            var queryStr = "SELECT * FROM `menus` WHERE `group_id` = ?";
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
                data: results[1]
            });

            return;
        }
    });
}

exports.create = create;
exports.update = update;
exports.list = list;