'use strict';

var async = require('async');
var value_checker = require('../helper/value_checker');
var error_handler = require('../helper/error_handler');
var models = require('../models');

function request(req, res, next) {

    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //필수 정보 받기.
    var group_id = req.body.group_id;
    var table_num = req.body.table_num;

    //빈 값이 있는지 확인.
    var checklist = [group_id, table_num];
    if(value_checker.is_empty_check(checklist)) {
        error_handler.custom_error_handler(400, 'Required value is empty!', null, next);
        return;
    }

    //선택적 정보 받기. (다만, 둘 다 비어있는 것은 reject)
    var menus = req.body.menus;
    var set_menus = (!!req.body.setmenus) ? req.body.setmenus : null;

    //음이 아닌 정수인지 확인.
    var num_check_list = [group_id, table_num];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        error_handler.custom_error_handler(400, 'GroupID and TableNum must be integer format!', null, next);
        return;
    }

    //숫자로 형변환
    group_id = parseInt(group_id);
    table_num = parseInt(table_num);

    //필요한 정보만 필터링한다. (메뉴 부분)
    var filtered_menu = [];
    for(var i in menus) {
        //메뉴가 잘못된 형식인지 검사한다.
        if(!menus[i].hasOwnProperty('id') || !menus[i].hasOwnProperty('name') || !menus[i].hasOwnProperty('count')) {
            error_handler.custom_error_handler(400, 'Wrong menu request format!', null, next);
            return;
        }

        //주문 수량이 있는 경우만 골라서 넣는다.
        if(menus[i].count > 0) {
            filtered_menu.push({
                id: menus[i].id,
                name: menus[i].name,
                count: menus[i].count
            });
        }
    }

    //필요한 정보만 필터링한다. (세트메뉴 부분)
    var filtered_setmenu = [];
    for(var i in set_menus) {
        //세트메뉴의 형식이 올바른지 검사한다.
        if(!set_menus[i].hasOwnProperty('id') || !set_menus[i].hasOwnProperty('name') || !set_menus[i].hasOwnProperty('count')) {
            error_handler.custom_error_handler(400, 'Wrong menu request format!', null, next);
            return;
        }

        //주문 수량이 있는 경우만 골라서 넣는다.
        if(set_menus[i].count > 0) {
            filtered_setmenu.push({
                id: set_menus[i].id,
                name: set_menus[i].name,
                count: set_menus[i].count
            });
        }
    }

    //아무것도 주문할 내역이 없는 경우를 필터링.
    if(filtered_menu.length == 0 && filtered_setmenu.length == 0) {
        error_handler.custom_error_handler(400, 'There is nothing to order!', null, next);
        return;
    }
    
    if(filtered_menu.length == 0) {
        filtered_menu = null;
    }
    
    if(filtered_setmenu.length == 0) {
        filtered_setmenu = null;
    }

    //주문 테이블에 추가한다.
    async.waterfall([
        //우선 이 그룹의 멤버인지 여부를 먼저 확인한다.
        function(callback) {
            (models.member).findOne({ where: { user_id: decoded_jwt['uid'], group_id: group_id } })
                .then(function(data) {
                    //미소속인 경우
                    if(!data) {
                        error_handler.custom_error_handler(403, 'Only member of this group can request an order!', null, next);
                        return;
                    }
                    //소속인 경우
                    else {
                        callback(null);
                    }
                })
                .catch(function(err) { callback(err) });
        },
        //요청한 메뉴ID에 접근 가능한지 검사한다.
        function(callback) {
            var filter_option = [];
            for(var i in filtered_menu) {
                filter_option.push(filtered_menu[i].id);
            }
            
            if(filter_option.length != 0) {
                (models.menu).findAndCountAll({
                    where: {
                        group_id: group_id,
                        id: filter_option
                    },
                    attributes: ['id', 'name', 'price', 'is_available']
                }).then(function(data) {
                    var result_menus = [];
                    for(var i in data.rows) {
                        result_menus.push(data.rows[i].dataValues);
                    }

                    if(result_menus.length != filtered_menu.length) {
                        error_handler.custom_error_handler(403, 'GroupID and MenuID mismatch!', null, next);
                        return;
                    }
                    else {
                        var deactivated_check = false;
                        var deactivated_error_message = "These menus are not available now!\nPlease refresh your menu list!\n";

                        for(var j in result_menus) {
                            if(result_menus[j].is_available != 1) {
                                deactivated_check = true;
                                deactivated_error_message += "'ID': " + result_menus[j].id + ", 'Name': " + result_menus[j] + "\n";
                            }
                        }

                        if(deactivated_check == true) {
                            error_handler.custom_error_handler(403, deactivated_error_message, null, next);
                            return;
                        }
                        else {
                            callback(null, result_menus);
                        }
                    }
                }).catch(function(err) { callback(err) });
            }
            else {
                callback(null, null);
            }
        },
        //요청한 세트메뉴ID에 접근 가능한지 검사한다.
        function(menu_list, callback) {
            var filter_option = [];
            for(var i in filtered_setmenu) {
                filter_option.push(filtered_setmenu[i].id);
            }

            if(filter_option.length != 0) {
                (models.setmenu).findAndCountAll({
                    where: {
                        group_id: group_id,
                        id: filter_option
                    },
                    attributes: ['id', 'name', 'price', 'is_available']
                }).then(function(data) {
                    var result_setmenus = [];
                    for(var i in data.rows) {
                        result_setmenus.push(data.rows[i].dataValues);
                    }

                    if(result_setmenus.length != filtered_setmenu.length) {
                        error_handler.custom_error_handler(403, 'GroupID and SetMenuID mismatch!', null, next);
                        return;
                    }
                    else {
                        var deactivated_check = false;
                        var deactivated_error_message = "These setmenus are not available now!\nPlease refresh your setmenu list!\n";

                        for(var j in result_setmenus) {
                            if(result_setmenus[j].is_available != 1) {
                                deactivated_check = true;
                                deactivated_error_message += "'ID': " + result_setmenus[j].id + ", 'Name': " + result_setmenus[j] + "\n";
                            }
                        }

                        if(deactivated_check == true) {
                            error_handler.custom_error_handler(403, deactivated_error_message, null, next);
                            return;
                        }
                        else {
                            callback(null, menu_list, result_setmenus);
                        }
                    }
                }).catch(function(err) { callback(err) });
            }
            else {
                callback(null, menu_list, null);
            }
        },
        //이제 주문 내용을 테이블에 집어넣는다.
        function(menu_list, setmenu_list, callback) {

            //TODO: N^2알고리즘인데 수정좀 해보자
            var total_price = 0;
            
            for(var i in menu_list) {
                for(var j in filtered_menu) {
                    if(menu_list[i].id == filtered_menu[j].id) {
                        total_price += menu_list[i].price * filtered_menu[j].count;
                    }
                }
            }
            
            for(var i in setmenu_list) {
                for(var j in filtered_setmenu) {
                    if(setmenu_list[i].id == filtered_setmenu[j].id) {
                        total_price += setmenu_list[i].price * filtered_setmenu[j].count;
                    }
                }
            }

            var newOrder = (models.order).build({
                user_id: decoded_jwt['uid'],
                group_id: group_id,
                content: filtered_menu,
                set_content: filtered_setmenu,
                total_price: total_price,
                table_num: table_num
            });

            newOrder.save().then(function() { callback(null, newOrder) }).catch(function(err) { callback(err) });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, results.dataValues);
    });
}

function confirm(req, res, next) {

    //JWT의 decode를 진행한다.
    var decoded_jwt = value_checker.jwt_checker(req.header('Authorization'));

    //필수 정보 받기.
    var order_id = req.params.order_id;
    var is_approve = (req.body.is_approve == 1) ? "1" : "0"; //문자열로 해줘야 밑의 empty check를 통과할 수 있음.

    //빈 값이 있는지 확인.
    var checklist = [order_id];
    if(value_checker.is_empty_check(checklist)) {
        error_handler.custom_error_handler(400, 'Required value is empty!', null, next);
        return;
    }

    //음이 아닌 정수인지 확인.
    var num_check_list = [order_id];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        error_handler.custom_error_handler(400, 'OrderID must be integer format!', null, next);
        return;
    }
    
    //숫자로 다시 형변환
    order_id = parseInt(order_id);
    is_approve = parseInt(is_approve);

    //처리 시작
    async.waterfall([
        //주문 정보를 받아온다.
        function(callback) {
            (models.order).findOne({ where: { id: order_id, approve_status: null } })
                .then(function(data) {
                    if(!data) {
                        error_handler.custom_error_handler(404, 'Cannot find requested order!', null, next);
                        return;
                    }
                    else {
                        callback(null, data);
                    }
                })
                .catch(function(err) { callback(err) });
        },
        //해당 주문에 해당하는 그룹의 creator인지 확인한다.
        function(order_obj, callback) {
            (models.group).findOne({ where: { id: order_obj.dataValues.group_id } })
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
                        callback(null, order_obj);
                    }

                })
                .catch(function(err) { callback(err) });
        },
        //승인 및 취소 절차를 진행한다.
        //TODO: Transaction Block required!(이 함수와 다음 함수까지)
        function(order_obj, callback) {
            order_obj.updateAttributes({
                approve_status: is_approve
            }).then(function(data) {
                callback(null, order_obj);
            }).catch(function(err) { callback(err) });
        },
        //주문 승인일 경우 메뉴별 대기열에 삽입한다.
        //TODO: Transaction Block required!(이 함수와 다음 함수까지!)
        function(order_obj, callback) {
            if(is_approve == 1) {
                var order_promise = [];

                //일반 주문의 처리
                var order_content = JSON.parse(order_obj.dataValues.content);
                for(var i in order_content) {
                    order_promise.push(new Promise(function(resolve, reject) {
                        var newWaiting = (models.waiting).build({
                            group_id: order_obj.dataValues.group_id,
                            menu_id: order_content[i].id,
                            amount: order_content[i].count,
                            table_num: order_obj.dataValues.table_num
                        });

                        newWaiting.save().then(function(data) {
                            resolve("Normal Finished");
                        }).catch(function(err) { callback(err) });
                    }));
                }

                var menu_list = [];
                var setmenu_list = [];

                //세트메뉴 주문의 처리를 위한 데이터 받아오기 작업.
                var promise_for_set_menu_prepare = new Promise(function(resolve, reject) {
                    (models.menu).findAndCountAll({ where: { group_id: order_obj.dataValues.group_id }})
                        .then(function(menu_data) {
                            for(var i in menu_data.rows) {
                                menu_list.push(menu_data.rows[i].dataValues);
                            }

                            (models.setmenu).findAndCountAll({ where: { group_id: order_obj.dataValues.group_id }})
                                .then(function(setmenu_data) {
                                    for(var i in setmenu_data.rows) {
                                        setmenu_list.push(setmenu_data.rows[i].dataValues);
                                    }

                                    resolve(null);
                                }).catch(function(err) { callback(err) });
                        }).catch(function(err) { callback(err) });
                });

                //세트메뉴 주문의 처리
                var order_set_content = JSON.parse(order_obj.dataValues.set_content);
                Promise.all([promise_for_set_menu_prepare]).then(function(values) {
                    for(var i in order_set_content) {
                        for(var j in setmenu_list) {
                            if(order_set_content[i].id == setmenu_list[j].id) {
                                var list_in_set = JSON.parse(setmenu_list[j].list);

                                for(var x in list_in_set) {
                                    for(var y in menu_list) {
                                        if(list_in_set[x] == menu_list[y].id) {
                                            order_promise.push(new Promise(function(resolve, reject) {
                                                var newWaiting = (models.waiting).build({
                                                    group_id: order_obj.dataValues.group_id,
                                                    menu_id: menu_list[y].id,
                                                    amount: order_set_content[i].count,
                                                    table_num: order_obj.dataValues.table_num
                                                });

                                                newWaiting.save().then(function(data) {
                                                    resolve("Setmenu Finished");
                                                }).catch(function(err) { callback(err) });
                                            }));
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Promise.all(order_promise).then(function(values) {
                        callback(null);
                    });
                });
            }
            else {
                callback(null);
            }
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

    //선택적 정보 받기.
    var show_only_pending = (req.query.show_only_pending == 1) ? "1" : "0";
    var show_only_my_request = (req.query.show_only_my_request == 1) ? "1" : "0";
    var order_per_page = (!!req.query.order_per_page) ? req.query.order_per_page : 20;
    var page_offset = (!!req.query.page_offset) ? req.query.page_offset : 1;
    var order_desc = (req.query.order_desc == 1) ? "1" : "0";

    //음이 아닌 정수인지 확인.
    var num_check_list = [group_id, order_per_page, page_offset];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        error_handler.custom_error_handler(400, 'GroupID and selective information must be integer format!', null, next);
        return;
    }

    //숫자로 형변환
    group_id = parseInt(group_id);
    show_only_pending = parseInt(show_only_pending);
    show_only_my_request = parseInt(show_only_my_request);
    order_per_page = parseInt(order_per_page);
    page_offset = parseInt(page_offset);
    order_desc = parseInt(order_desc);

    //페이지 번호 조정
    page_offset = page_offset - 1;
    if(page_offset < 0) page_offset = 0;

    //조회 시작
    //TODO: JOIN을 사용해야 하는 부분을 이상하게 구현했으니 반드시 바꿀 것!
    async.waterfall([
        //우선 이 그룹 접근 가능 여부를 확인한다.
        function(callback) {
            (models.member).findOne({ where: { user_id: decoded_jwt['uid'], group_id: group_id } })
                .then(function(data) {
                    //미소속인 경우
                    if(!data) {
                        error_handler.custom_error_handler(403, 'Only member of this group can get list of orders!', null, next);
                        return;
                    }
                    //소속인 경우
                    else {
                        callback(null);
                    }
                })
                .catch(function(err) { callback(err) });
        },
        //주문 리스트를 조회한다.
        function(callback) {
            var filter_option = {
                group_id: group_id
            };

            if(show_only_my_request == 1) {
                filter_option['user_id'] = decoded_jwt['uid'];
            }

            if(show_only_pending == 1) {
                filter_option['approve_status'] = null;
            }

            var order_option = null;
            if(order_desc == 1) {
                order_option = 'id DESC';
            }
            else {
                order_option = 'id ASC';
            }

            (models.order).findAndCountAll({
                where: filter_option,
                limit: order_per_page,
                offset: (page_offset * order_per_page),
                order: order_option
            }).then(function(data) {
                var order_list = [];
                for(var i in data.rows) {
                    order_list.push(data.rows[i].dataValues);
                }
                callback(null, {
                    count: data.count,
                    order_list: order_list
                });
            }).catch(function(err) { callback(err) });
        },
        //유저 이름을 삽입한다.
        function(order_info, callback) {
            var user_filter_set = new Set();
            for(var i in order_info.order_list) {
                user_filter_set.add(order_info.order_list[i].user_id);
            }
            var user_filter = Array.from(user_filter_set);

            (models.user).findAndCountAll({
                attributes: ['id', 'name'],
                where: { id: user_filter }
            }).then(function(data) {

                var user_list = [];
                for(var i in data.rows) {
                    user_list.push(data.rows[i].dataValues);
                }

                var final_order_list = [];
                for(var i in order_info.order_list) {
                    for(var j in user_list) {
                        if(order_info.order_list[i].user_id == user_list[j].id) {
                            final_order_list.push({
                                id: order_info.order_list[i].id,
                                user_id: user_list[j].id,
                                user_name: user_list[j].name,
                                group_id: order_info.order_list[i].group_id,
                                content: JSON.parse(order_info.order_list[i].content),
                                set_content: JSON.parse(order_info.order_list[i].set_content),
                                total_price: order_info.order_list[i].total_price,
                                table_num: order_info.order_list[i].table_num,
                                approve_status: order_info.order_list[i].approve_status,
                                createdAt: order_info.order_list[i].createdAt,
                                updatedAt: order_info.order_list[i].updatedAt
                            });

                            break;
                        }
                    }
                }

                callback(null, {
                    list: final_order_list,
                    pagination_info: value_checker.get_pagination_info(page_offset, order_per_page, order_info.count)
                });
            }).catch(function(err) { callback(err) });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, results);
    });
}

exports.request = request;
exports.confirm = confirm;
exports.list = list;