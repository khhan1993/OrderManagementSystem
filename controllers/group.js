'use strict';

var async = require('async');
var value_checker = require('../helper/value_checker');
var error_handler = require('../helper/error_handler');
var models = require('../models');

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
    //TODO: Concurrency 및 Transaction 문제가 발생할 수 있음. 확실하게 하고싶다면 lock을 사용할 것!
    async.waterfall([
        //그룹 생성
        function(callback) {
            var newGroup = (models.group).build({
                name: name,
                creator: decoded_jwt['uid']
            });

            newGroup.save().then(function(data) { callback(null, data) }).catch(function(err) { callback(err) });
        },
        //멤버 추가
        function(inserted_data, callback) {
            var newMember = (models.member).build({
                user_id: inserted_data.dataValues.creator,
                group_id: inserted_data.dataValues.id
            });

            newMember.save().then(function() { callback(null) }).catch(function(err) { callback(err) });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, null);
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
        //TODO: DB JOIN으로 수정할 수 있도록 할 것! (2, 3번째 함수)
        function(callback) {
            (models.member).findOne({ where: { user_id: decoded_jwt['uid'], group_id: group_id } })
                .then(function(data) {
                    //미소속인 경우
                    if(!data) {
                        error_handler.custom_error_handler(403, 'Only member of this group can get member list!', null, next);
                        return;
                    }
                    //소속인 경우
                    else {
                        callback(null);
                    }
                })
                .catch(function(err) { callback(err) });
        },
        //그룹 정보를 조회한다.
        function(callback) {
            (models.group).findOne({ where: { id: group_id } })
                .then(function(data) {
                    callback(null, data.dataValues);
                })
                .catch(function(err) { callback(err) });
        },
        //만든사람 정보 조회
        function(group_info, callback) {
            (models.user).findOne({ where: { id: group_info.creator } })
                .then(function(data) {
                    var added_data = {
                        group_id: group_info.id,
                        group_name: group_info.name,
                        group_creator : {
                            user_id: data.dataValues.id,
                            user_name: data.dataValues.name
                        },
                        group_creation_date: group_info.createdAt
                    };

                    callback(null, added_data);
                })
                .catch(function(err) { callback(err) });
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
            (models.group).findOne({ where: { id: group_id } })
                .then(function(data) {
                    if(!data) {
                        error_handler.custom_error_handler(404, 'Cannot get requested group info!', null, next);
                        return;
                    }
                    else if(data.dataValues.creator != decoded_jwt['uid']) {
                        error_handler.custom_error_handler(403, 'You are not a creator of this group!', null, next);
                        return;
                    }
                    else {
                        callback(null);
                    }

                })
                .catch(function(err) { callback(err) });
        },
        //추가하려는 유저가 실제 가입했는지 확인.
        function(callback) {
            (models.user).findOne({ where: { email: email, is_active: 1 }})
                .then(function(data) {
                    if(!data) {
                        error_handler.custom_error_handler(404, 'Cannot get requested user info!', null, next);
                        return;
                    }
                    else {
                        callback(null, data);
                    }
                })
                .catch(function(err) { callback(err) });
        },
        //해당 그룹에 이미 추가되어있는지 확인한다.
        //TODO: 이 부분에서 Concurrency 문제 발생 가능!
        function(user_info, callback) {
            (models.member).find({ where: { user_id: user_info.dataValues.id, group_id: group_id } })
                .then(function(data) {
                    console.log(data);
                    if(!data) {
                        callback(null, user_info);
                    }
                    else {
                        error_handler.custom_error_handler(400, 'Requested user already added to group!', null, next);
                        return;
                    }
                })
                .catch(function(err) { callback(err) });
        },
        //이제 유저를 이 그룹에 추가한다.
        //TODO: 이 부분에서 Concurrency 문제 발생 가능!
        function(user_info, callback) {
            var newMember = (models.member).build({
                user_id: user_info.dataValues.id,
                group_id: group_id
            });

            newMember.save().then(function() { callback(null) }).catch(function(err) { callback(err) });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, null);
    });
}

function left(req, res, next) {
    let custom_err = new Error('Not implemented yet!');
    custom_err.status = 403;
    next(custom_err);
}

function list(req, res, next) {

    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //유저가 속한 그룹의 리스트를 얻는다.
    //TODO: JOIN 쿼리로 해결할 수 있도록 할 것! (지금의 구현은 ORM사용법 미숙으로 인해 급하게 구현한 것!)
    async.waterfall([
        //멤버 리스트 조회
        function(callback) {
            (models.member).findAndCountAll({
                where: { user_id: decoded_jwt['uid'] },
                attributes: ['user_id', 'group_id']
            }).then(function(data) {
                var member_list = [];
                for(var i in data.rows) {
                    member_list.push(data.rows[i].dataValues);
                }
                callback(null, member_list);
            }).catch(function(err) { callback(err) });
        },
        //그룹 리스트 조회
        function(member_list, callback) {
            var filter_option = [];
            for(var i in member_list) {
                filter_option.push(member_list[i].group_id);
            }

            (models.group).findAndCountAll({
                where: { id: filter_option }
            }).then(function(data) {
                var group_list = [];
                for(var i in data.rows) {
                    group_list.push(data.rows[i].dataValues);
                }
                callback(null, group_list);
            }).catch(function(err) { callback(err) });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, results);
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
    async.waterfall([
        //우선 해당 그룹에 속한 멤버인지 확인한다.
        //TODO: DB JOIN으로 수정할 수 있도록 할 것! (2, 3번째 함수)
        function(callback) {
            (models.member).findOne({ where: { user_id: decoded_jwt['uid'], group_id: group_id } })
                .then(function(data) {
                    //미소속인 경우
                    if(!data) {
                        error_handler.custom_error_handler(403, 'Only member of this group can get member list!', null, next);
                        return;
                    }
                    //소속인 경우
                    else {
                        callback(null);
                    }
                })
                .catch(function(err) { callback(err) });
        },
        //멤버 리스트를 조회한다.
        function(callback) {
            (models.member).findAndCountAll({ where: { group_id: group_id } })
                .then(function(data) {
                    var member_list = [];
                    for(var i in data.rows) {
                        member_list.push(data.rows[i].dataValues);
                    }
                    callback(null, member_list);
                })
                .catch(function(err) { callback(err) });
        },
        //이름을 얻어볼까??
        function(member_list, callback) {
            var filter_option = [];
            for(var i in member_list) {
                filter_option.push(member_list[i].user_id);
            }

            (models.user).findAndCountAll({
                where: { id: filter_option },
                attributes: ['id', 'name', 'createdAt']
            }).then(function(data) {
                    var user_list = [];
                    for(var i in data.rows) {
                        user_list.push(data.rows[i].dataValues);
                    }
                    callback(null, user_list);
                }).catch(function(err) { callback(err) });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, results);
    });
}

exports.create = create;
exports.info = info;
exports.join = join;
exports.left = left;
exports.list = list;
exports.members = members;