'use strict';

var async = require('async');
var value_checker = require('../helper/value_checker');
var error_handler = require('../helper/error_handler');
var app = require('../app');

function create(req, res, next) {

    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //필수 정보 받기.
    var name = req.body.name;

    //빈 값이 있는지 확인.
    var checklist = [name];
    if(value_checker.is_empty_check(checklist)) {
        error_handler.custom_error_handler(400, 'Required value is empty!', null, next);
        return;
    }

    //그룹 생성 절차를 진행한다.
    app.db_connection.beginTransaction(function(_err) {
        if(_err) {
            error_handler.async_final(_err, res, next, null);
            return;
        }

        async.waterfall([
            //그룹 생성
            function(callback) {
                let queryStr = "INSERT INTO `groups` SET ?";
                let queryVal = {
                    name: name,
                    creator: decoded_jwt['uid'],
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        app.db_connection.rollback(function() {
                            callback(err);
                        });
                    }
                    else {
                        callback(null, rows.insertId);
                    }
                });
            },
            //멤버 추가
            function(group_id, callback) {
                let queryStr = "INSERT INTO `members` SET ?";
                let queryVal = {
                    user_id: decoded_jwt['uid'],
                    group_id: group_id,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        app.db_connection.rollback(function() {
                            callback(err);
                        });
                    }
                    else {
                        callback(null);
                    }
                });
            },
            //Transaction Commit
            function(callback) {
                app.db_connection.commit(function(err) {
                    if(err) {
                        app.db_connection.rollback(function() {
                            callback(err);
                        });
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
    });
}

function info(req, res, next) {

    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //필수 정보 받기.
    var group_id = req.params.group_id;

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

    //그룹 정보 받기
    async.waterfall([
        //우선 해당 그룹에 속한 멤버인지 확인한다.
        function(callback) {
            let queryStr = "SELECT * FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            let queryVal = [decoded_jwt['uid'], group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        //미소속
                        error_handler.custom_error_handler(403, 'Only member of this group can get member list!', null, next);
                        return;
                    }
                    else {
                        //소속
                        callback(null);
                    }
                }
            });
        },
        //그룹 정보를 조회한다.
        function(callback) {
            let queryStr = "SELECT `groups`.`id` AS `group_id`, `groups`.`name` AS `group_name`, `groups`.`createdAt` AS `group_creation_date`, `users`.`id` AS `user_id`, `users`.`name` AS `user_name` ";
            queryStr += "FROM `groups` INNER JOIN `users` ON `groups`.`creator` = `users`.`id` WHERE `groups`.`id` = ?";
            let queryVal = [group_id];
            app.db_connection.query(queryStr, queryVal, function (err, rows, fields) {
                if (err) {
                    callback(err);
                }
                else {
                    var added_data = {
                        group_id: rows[0].group_id,
                        group_name: rows[0].group_name,
                        group_creator: {
                            user_id: rows[0].user_id,
                            user_name: rows[0].user_name
                        },
                        group_creation_date: rows[0].group_creation_date
                    };

                    callback(null, added_data);
                }
            });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, results);
    });
}

function join(req, res, next) {

    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //필수 정보 받기.
    var group_id = req.body.group_id;
    var email = req.body.email;

    //빈 값이 있는지 확인.
    var checklist = [group_id, email];
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

    //유저 추가 작업 진행
    async.waterfall([
        //우선 Group의 creator인지를 확인한다.
        function(callback) {
            let queryStr = "SELECT * FROM `groups` WHERE `id` = ?";
            let queryVal = [group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        error_handler.custom_error_handler(404, 'Cannot get requested group info!', null, next);
                        return;
                    }
                    else if(rows[0].creator != decoded_jwt['uid']) {
                        error_handler.custom_error_handler(403, 'You are not a creator of this group!', null, next);
                        return;
                    }
                    else {
                        callback(null);
                    }
                }
            });
        },
        //추가하려는 유저가 실제 가입했는지 확인.
        function(callback) {
            let queryStr = "SELECT * FROM `users` WHERE `email` = ? AND `is_active` = 1";
            let queryVal = [email];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        error_handler.custom_error_handler(404, 'Cannot get requested user info!', null, next);
                        return;
                    }
                    else {
                        callback(null, rows[0]);
                    }
                }
            });
        },
        //해당 그룹에 이미 추가되어있는지 확인한다.
        function(user_info, callback) {
            let queryStr = "SELECT * FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            let queryVal = [user_info.id, group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        callback(null, user_info);
                    }
                    else {
                        error_handler.custom_error_handler(400, 'Requested user already added to group!', null, next);
                        return;
                    }
                }
            });
        },
        //이제 유저를 이 그룹에 추가한다.
        function(user_info, callback) {
            let queryStr = "INSERT INTO `members` SET ?";
            let queryVal = {
                user_id: user_info.id,
                group_id: group_id,
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

function removeMember(req, res, next) {
    
    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //필수 정보 받기.
    var group_id = req.body.group_id;
    var user_id = req.body.user_id;

    //빈 값이 있는지 확인.
    var checklist = [group_id, user_id];
    if(value_checker.is_empty_check(checklist)) {
        error_handler.custom_error_handler(400, 'Required value is empty!', null, next);
        return;
    }

    //음이 아닌 정수인지 확인.
    var num_check_list = [group_id, user_id];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        error_handler.custom_error_handler(400, 'GroupID must be integer format!', null, next);
        return;
    }

    //유저의 제거를 시작한다.
    async.waterfall([
        //우선 Group의 creator인지를 확인한다.
        function(callback) {
            let queryStr = "SELECT * FROM `groups` WHERE `id` = ?";
            let queryVal = [group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        error_handler.custom_error_handler(404, 'Cannot get requested group info!', null, next);
                        return;
                    }
                    else if(rows[0].creator != decoded_jwt['uid']) {
                        error_handler.custom_error_handler(403, 'You are not a creator of this group!', null, next);
                        return;
                    }
                    else if(rows[0].creator == user_id) {
                        error_handler.custom_error_handler(403, 'Cannot remove creator!', null, next);
                        return;
                    }
                    else {
                        callback(null);
                    }
                }
            });
        },
        //지정한 유저를 검색한다.
        function(callback) {
            let queryStr = "SELECT `id` FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            let queryVal = [user_id, group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        error_handler.custom_error_handler(404, 'Cannot get requested member info!', null, next);
                        return;
                    }
                    else {
                        callback(null, rows[0].id);
                    }
                }
            });
        },
        //지정한 유저를 삭제한다.
        function(member_id, callback) {
            let queryStr = "DELETE FROM `members` WHERE `id` = ? AND `group_id` = ?";
            let queryVal = [member_id, group_id];
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

function list(req, res, next) {

    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //유저가 속한 그룹의 리스트를 얻는다.
    async.series([
        function(callback) {
            let queryStr = "SELECT `groups`.`id`, `groups`.`name`, `groups`.`createdAt` ";
            queryStr += "FROM `members` INNER JOIN `groups` ON ";
            queryStr += "`groups`.`id` = `members`.`group_id` WHERE `members`.`user_id` = ?";
            let queryVal = [decoded_jwt['uid']];
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
        error_handler.async_final(err, res, next, results[0]);
    });
}

function members(req, res, next) {
    
    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //필수 정보 받기.
    var group_id = req.params.group_id;

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

    //멤버 정보 받기
    async.series([
        //우선 해당 그룹에 속한 멤버인지 확인한다.
        function(callback) {
            let queryStr = "SELECT * FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            let queryVal = [decoded_jwt['uid'], group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        error_handler.custom_error_handler(403, 'Only member of this group can get member list!', null, next);
                        return;
                    }
                    else {
                        callback(null);
                    }
                }
            });
        },
        //멤버 리스트를 조회한다.
        function(callback) {
            let queryStr = "SELECT `users`.`id`, `users`.`name`, `members`.`createdAt` FROM ";
            queryStr += "`users` INNER JOIN `members` ON ";
            queryStr += "`members`.`group_id` = ? AND `users`.`id` = `members`.`user_id`";
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
        error_handler.async_final(err, res, next, results[1]);
    });
}

exports.create = create;
exports.info = info;
exports.join = join;
exports.removeMember = removeMember;
exports.list = list;
exports.members = members;