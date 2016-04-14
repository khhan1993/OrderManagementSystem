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

    //빈 값이 있는지 확인.
    var checklist = [name];
    if(value_checker.is_empty_check(checklist)) {
        let custom_err = new Error('Required value is empty!');
        custom_err.status = 400;
        next(custom_err);
        
        return;
    }

    //그룹 생성 절차를 진행한다.
    //TODO: Transaction block required!
    async.waterfall([
        //우선 그룹을 생성한다.
        function(callback) {
            var queryStr = "INSERT INTO `groups` SET `name` = ?, `creator` = ?, `created_at` = ?, `updated_at` = ?";
            var queryVal = [name, decoded_jwt['uid'], unixTime(new Date()), unixTime(new Date())];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    callback(null, rows.insertId);
                }
            });
        },
        //그 다음에 멤버 추가도 진행한다.
        function(inserted_id, callback) {
            var queryStr = "INSERT INTO `members` SET `user_id` = ?, `group_id` = ?, `identifier` = ?, `created_at` = ?, `updated_at` = ?";
            var queryVal = [decoded_jwt['uid'], inserted_id, sha512(decoded_jwt['uid'] + "UNIQUE" + inserted_id).toString('hex'), unixTime(new Date()), unixTime(new Date())];
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

function info(req, res, next) {

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
    var group_id = req.params.group_id;

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

    //그룹 정보를 조회한다.
    async.series([
        //우선 해당 그룹에 속해있는 유저인지 검사한다.
        function(callback) {
            var queryStr = "SELECT COUNT(*) AS `check_count` FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            var queryVal = [decoded_jwt['uid'], group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows[0].check_count == 0) {
                        let custom_err = new Error('Only member of this group can get information about it!');
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
        //이제 그룹 정보를 가져온다.
        function(callback) {
            var queryStr = "SELECT `groups`.`id`, `groups`.`name` AS `group_name`, `users`.`name` AS `creator_name`, `groups`.`created_at` FROM `groups` JOIN `users` ON `users`.`id` = `groups`.`creator` AND `groups`.`id` = ?";
            var queryVal = [group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    callback(null, rows[0]);
                }
            });
        },
        //그룹의 멤버 수도 가져온다.
        function(callback) {
            var queryStr = "SELECT COUNT(*) AS `check_count` FROM `members` WHERE `group_id` = ?";
            var queryVal = [group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    callback(null, rows[0].check_count);
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
                    group_info: results[1],
                    num_of_group_members: results[2],
                    user_info: {
                        uid: decoded_jwt['uid'],
                        name: decoded_jwt['name'],
                        email: decoded_jwt['email'],
                        ip_address: decoded_jwt['ip_address'],
                        exp: decoded_jwt['exp']
                    }
                }
            });

            return;
        }
    });
}

function join(req, res, next) {

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
    var group_id = req.body.group_id;
    var email = req.body.email;

    //빈 값이 있는지 확인.
    var checklist = [group_id, email];
    if(value_checker.is_empty_check(checklist)) {
        let custom_err = new Error('Required value is empty!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //음이 아닌 정수인지 확인.
    var num_check_list = [group_id];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        let custom_err = new Error('GroupID and UserID must be integer format!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //유저를 그룹에 추가하는 작업을 진행한다.
    async.waterfall([
        //우선 Group의 creator인지를 확인한다.
        function(callback) {
            var queryStr = "SELECT COUNT(*) AS `check_count` FROM `groups` WHERE `id` = ? AND `creator` = ?";
            var queryVal = [group_id, decoded_jwt['uid']];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows[0].check_count == 0) {
                        let custom_err = new Error('Only creator of this group can add user!');
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
        //그 다음엔 추가할려는 유저가 이미 존재하는 유저인지 확인한다.
        function(callback) {
            var queryStr = "SELECT * FROM `users` WHERE `email` = ? AND `is_active` = 1";
            var queryVal = [email];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        let custom_err = new Error('Requested email is not avaliable!');
                        custom_err.status = 400;
                        next(custom_err);

                        return;
                    }
                    else {
                        callback(null, rows[0]);
                    }
                }
            });
        },
        //중복으로 추가되는것을 방지하기 위해 해당 그룹의 멤버로 이미 추가되어있는지 확인한다.
        function(user_info, callback) {
            var queryStr = "SELECT COUNT(*) AS `check_count` FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            var queryVal = [user_info.id, group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows[0].check_count != 0) {
                        let custom_err = new Error('Requested user already added to group!');
                        custom_err.status = 400;
                        next(custom_err);

                        return;
                    }
                    else {
                        callback(null, user_info);
                    }
                }
            });
        },
        //이제 유저를 이 그룹의 멤버로 추가한다.
        function(user_info, callback) {
            var queryStr = "INSERT INTO `members` SET `user_id` = ?, `group_id` = ?, `identifier` = ?, `created_at` = ?, `updated_at` = ?";
            var queryVal = [user_info,id, group_id, sha512(user_id + "UNIQUE" + group_id).toString('hex'), unixTime(new Date()), unixTime(new Date())];
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

function left(req, res, next) {
    let custom_err = new Error('Not implemented yet!');
    custom_err.status = 404;
    next(custom_err);
}

//자신이 속해있는 그룹 리스트만 출력된다.
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

    //유저가 속해있는 그룹 정보를 받아온다.
    async.series([
        function(callback) {
            var queryStr = "SELECT `groups`.`id`, `groups`.`name`, `groups`.`created_at` FROM `groups` JOIN `members` ON `groups`.`id` = `members`.`group_id` AND `user_id` = ?";
            var queryVal = [decoded_jwt['uid']];
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
                data: results[0]
            });

            return;
        }
    });
}

function members(req, res, next) {

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

    //멤버 정보를 받아온다.
    async.series([
        //우선 해당 그룹에 속해있는 유저인지 검사한다.
        function(callback) {
            var queryStr = "SELECT COUNT(*) AS `check_count` FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            var queryVal = [decoded_jwt['uid'], group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows[0].check_count == 0) {
                        let custom_err = new Error('Only member of this group can get information about it!');
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
        //멤버 정보를 받아온다.
        function(callback) {
            var queryStr = "SELECT `users`.`id`, `users`.`name`, `members`.`created_at` FROM `users` JOIN `members` ON `users`.`id` = `members`.`user_id` AND `members`.`group_id` = ?";
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
exports.info = info;
exports.join = join;
exports.left = left;
exports.list = list;
exports.members = members;