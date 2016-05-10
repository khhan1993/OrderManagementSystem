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
    var price = req.body.price;
    var group_id = req.body.group_id;
    var menu_list = req.body.menu_list;

    //빈 값이 있는지 확인.
    var checklist = [name, price, group_id, menu_list];
    if(value_checker.is_empty_check(checklist)) {
        error_handler.custom_error_handler(400, 'Required value is empty!', null, next);
        return;
    }
    
    //메뉴리스트 비어있는지 확인.
    if(menu_list.length == 0) {
        error_handler.custom_error_handler(400, 'Required value is empty!', null, next);
        return;
    }

    //음이 아닌 정수인지 확인.
    var num_check_list = [price, group_id];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        error_handler.custom_error_handler(400, 'GroupID and Price must be integer format!', null, next);
        return;
    }

    //숫자는 숫자로 형변환
    price = parseInt(price);
    group_id = parseInt(group_id);
    for(let i in menu_list) {
        menu_list[i] = parseInt(menu_list[i]);
        if(isNaN(menu_list[i])) {
            error_handler.custom_error_handler(400, 'MenuList element must be integer format!', null, next);
            return;
        }
    }

    //메뉴 그룹 매칭 확인용 조건 지정
    var group_match_option_set = new Set();
    for(let i in menu_list) {
        group_match_option_set.add(menu_list[i]);
    }
    var group_match_option = Array.from(group_match_option_set);

    //세트메뉴의 추가 작업을 시작한다.
    async.series([
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
        //세트메뉴에 추가할 메뉴가 해당 그룹의 메뉴인지 확인한다.
        function(callback) {
            (models.menu).findAndCountAll({
                where: {
                    group_id: group_id,
                    id: group_match_option
                }
            }).then(function(data) {
                if(data.count != group_match_option.length) {
                    error_handler.custom_error_handler(403, 'GroupID and MenuID mismatch!', null, next);
                    return;
                }
                else {
                    callback(null);
                }
            }).catch(function(err) { callback(err) });
        },
        //세트메뉴를 추가한다
        function(callback) {
            var newSetMenu = (models.setmenu).build({
                name: name,
                price: price,
                group_id: group_id,
                list: menu_list
            });

            newSetMenu.save().then(function() { callback(null) }).catch(function(err) { callback(err) });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, null);
    });
}

function update(req, res, next) {

    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //필수 정보 받기.
    var setmenu_id = req.params.setmenu_id;
    var price = req.body.price;
    var is_available = (req.body.is_available == 1) ? "1" : "0"; //정수형태로 넣어주면 밑의 empty_check를 통과하지 못함.

    //빈 값이 있는지 확인.
    var checklist = [setmenu_id, price, is_available];
    if(value_checker.is_empty_check(checklist)) {
        error_handler.custom_error_handler(400, 'Required value is empty!', null, next);
        return;
    }

    //음이 아닌 정수인지 확인.
    var num_check_list = [price, setmenu_id];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        error_handler.custom_error_handler(400, 'SetMenuID and Price must be integer format!', null, next);
        return;
    }

    //숫자는 숫자로 형변환
    setmenu_id = parseInt(setmenu_id);
    price = parseInt(price);
    is_available = parseInt(is_available);

    //업데이트 진행
    async.waterfall([
        //메뉴 정보를 가져온다.
        function(callback) {
            (models.setmenu).findOne({ where: { id: setmenu_id } })
                .then(function(data) {
                    //메뉴 정보가 없을 경우.
                    if(!data) {
                        error_handler.custom_error_handler(404, 'Cannot find requested setmenu!', null, next);
                        return;
                    }
                    //메뉴 정보가 있을 경우.
                    else {
                        callback(null, data);
                    }
                })
                .catch(function(err) { callback(err) });
        },
        //Group의 creator인지를 확인한다.
        function(setmenu_obj, callback) {
            (models.group).findOne({ where: { id: setmenu_obj.dataValues.group_id } })
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
                        callback(null, setmenu_obj);
                    }

                })
                .catch(function(err) { callback(err) });
        },
        //메뉴 정보를 업데이트한다.
        function(setmenu_obj, callback) {
            setmenu_obj.updateAttributes({
                price: price,
                is_available: is_available
            }).then(function(data) {
                callback(null);
            }).catch(function(err) { callback(err) });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, null);
    });
}

function list(req, res, next) {

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
        error_handler.custom_error_handler(400, 'Price must be integer format!', null, next);
        return;
    }

    //숫자 형변환
    group_id = parseInt(group_id);

    //메뉴 리스트 조회
    async.series([
        //우선 이 그룹의 멤버인지 여부를 먼저 확인한다.
        function(callback) {
            (models.member).findOne({ where: { user_id: decoded_jwt['uid'], group_id: group_id } })
                .then(function(data) {
                    //미소속인 경우
                    if(!data) {
                        error_handler.custom_error_handler(403, 'Only member of this group can create menu for this group!', null, next);
                        return;
                    }
                    //소속인 경우
                    else {
                        callback(null);
                    }
                })
                .catch(function(err) { callback(err) });
        },
        //리스트를 조회한다.
        function(callback) {
            (models.setmenu).findAndCountAll({
                where: { group_id: group_id },
                attributes: ['id', 'name', 'price', 'is_available', 'list']
            }).then(function(data) {
                var setmenu_list = [];
                for(var i in data.rows) {
                    setmenu_list.push(data.rows[i].dataValues);
                }
                callback(null, setmenu_list);
            }).catch(function(err) { callback(err) });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, results[1]);
    });
}

exports.create = create;
exports.update = update;
exports.list = list;