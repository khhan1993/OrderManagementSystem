'use strict';

var async = require('async');
var value_checker = require('../helper/value_checker');
var error_handler = require('../helper/error_handler');
var app = require('../app');

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
            let queryStr = "SELECT * FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            let queryVal = [decoded_jwt['uid'], group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    //미소속인 경우
                    if(rows.length == 0) {
                        error_handler.custom_error_handler(403, 'Only member of this group can request an order!', null, next);
                        return;
                    }
                    //소속인 경우
                    else {
                        callback(null);
                    }
                }
            });
        },
        //요청한 메뉴ID에 접근 가능한지 검사한다.
        function(callback) {
            var filter_option = [];
            for(var i in filtered_menu) {
                filter_option.push(filtered_menu[i].id);
            }
            
            if(filter_option.length != 0) {
                let queryStr = "SELECT `id`, `name`, `price`, `is_available` FROM `menus` WHERE `group_id` = ? AND `id` IN (?)";
                let queryVal = [group_id, filter_option];
                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        if(rows.length != filtered_menu.length) {
                            error_handler.custom_error_handler(403, 'GroupID and MenuID mismatch!', null, next);
                            return;
                        }
                        else {
                            var deactivated_check = false;
                            var deactivated_error_message = "These menus are not available now!\nPlease refresh your menu list!\n";

                            for(let i in rows) {
                                if(rows[i].is_available != 1) {
                                    deactivated_check = true;
                                    deactivated_error_message += "'ID': " + rows[i].id + ", 'Name': " + rows[i].name + "\n";
                                }
                            }

                            if(deactivated_check == true) {
                                error_handler.custom_error_handler(403, deactivated_error_message, null, next);
                                return;
                            }
                            else {
                                callback(null, rows);
                            }
                        }
                    }
                });
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
                let queryStr = "SELECT `id`, `name`, `price`, `is_available` FROM `setmenus` WHERE `group_id` = ? AND `id` IN (?)";
                let queryVal = [group_id, filter_option];
                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        if(rows.length != filtered_setmenu.length) {
                            error_handler.custom_error_handler(403, 'GroupID and SetMenuID mismatch!', null, next);
                            return;
                        }
                        else {
                            var deactivated_check = false;
                            var deactivated_error_message = "These setmenus are not available now!\nPlease refresh your setmenu list!\n";

                            for(let i in rows) {
                                if(rows[i].is_available != 1) {
                                    deactivated_check = true;
                                    deactivated_error_message += "'ID': " + rows[i].id + ", 'Name': " + rows[i].name + "\n";
                                }
                            }

                            if(deactivated_check == true) {
                                error_handler.custom_error_handler(403, deactivated_error_message, null, next);
                                return;
                            }
                            else {
                                callback(null, menu_list, rows);
                            }
                        }
                    }
                });
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
            
            let queryStr = "INSERT INTO `orders` SET ?";
            let queryVal = {
                user_id: decoded_jwt['uid'],
                group_id: group_id,
                content: JSON.stringify(filtered_menu),
                set_content: JSON.stringify(filtered_setmenu),
                total_price: total_price,
                table_num: table_num,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    callback(null, rows.insertId);
                }
            });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, results);
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
            let queryStr = "SELECT * FROM `orders` WHERE `id` = ? AND `approve_status` IS NULL";
            let queryVal = [order_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        error_handler.custom_error_handler(404, 'Cannot find requested order!', null, next);
                        return;
                    }
                    else {
                        callback(null, rows[0]);
                    }
                }
            });
        },
        //해당 주문에 해당하는 그룹의 creator인지 확인한다.
        function(order_data, callback) {
            let queryStr = "SELECT * FROM `groups` WHERE `id` = ?";
            let queryVal = [order_data.group_id];
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
                        callback(null, order_data);
                    }
                }
            });
        },
        function(order_data, callback) {
            var async_func_list = [];

            async_func_list.push(function(_callback) {
                let queryStr = "UPDATE `orders` SET `approve_status` = ?, `updatedAt` = ? WHERE `id` = ?";
                let queryVal = [is_approve, new Date(), order_id];
                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        app.db_connection.rollback(function() {
                            _callback(err);
                        });
                    }
                    else {
                        _callback(null);
                    }
                });
            });

            if(is_approve == 1) {
                //일반 주문의 처리
                var order_content = JSON.parse(order_data.content);
                for(var i in order_content) {
                    let queryStr = "INSERT INTO `waitings` SET ?";
                    let queryVal = {
                        group_id: order_data.group_id,
                        menu_id: order_content[i].id,
                        amount: order_content[i].count,
                        table_num: order_data.table_num,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    };
                    async_func_list.push(function(_callback) {
                        app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                            if(err) {
                                app.db_connection.rollback(function() {
                                    _callback(err);
                                });
                            }
                            else {
                                _callback(null);
                            }
                        });
                    });
                }

                var menu_list = [];
                var setmenu_list = [];

                //세트메뉴 주문의 처리를 위한 데이터 받아오기 작업.
                var promise_for_set_menu_prepare = new Promise(function(resolve, reject) {
                    let menuQueryStr = "SELECT * FROM `menus` WHERE `group_id` = ?";
                    let menuQueryVal = [order_data.group_id];
                    app.db_connection.query(menuQueryStr, menuQueryVal, function(err, rows, fields) {
                        if(err) {
                            reject(err);
                        }
                        else {
                            menu_list = rows;

                            let setmenuQueryStr = "SELECT * FROM `setmenus` WHERE `group_id` = ?";
                            let setmenuQueryVal = [order_data.group_id];
                            app.db_connection.query(setmenuQueryStr, setmenuQueryVal, function(_err, _rows, _fields) {
                                if(_err) {
                                    reject(_err);
                                }
                                else {
                                    setmenu_list = _rows;
                                    resolve(null);
                                }
                            });
                        }
                    });
                });

                //세트메뉴 주문의 처리
                var order_set_content = JSON.parse(order_data.set_content);
                Promise.all([promise_for_set_menu_prepare]).then(function(values) {
                    for(var i in order_set_content) {
                        for(var j in setmenu_list) {
                            if(order_set_content[i].id == setmenu_list[j].id) {
                                var list_in_set = JSON.parse(setmenu_list[j].list);

                                for(var x in list_in_set) {
                                    for(var y in menu_list) {
                                        if(list_in_set[x] == menu_list[y].id) {
                                            let queryStr = "INSERT INTO `waitings` SET ?";
                                            let queryVal = {
                                                group_id: order_data.group_id,
                                                menu_id: menu_list[y].id,
                                                amount: order_set_content[i].count,
                                                table_num: order_data.table_num,
                                                createdAt: new Date(),
                                                updatedAt: new Date()
                                            };
                                            async_func_list.push(function(_callback) {
                                                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                                                    if(err) {
                                                        app.db_connection.rollback(function() {
                                                            _callback(err);
                                                        });
                                                    }
                                                    else {
                                                        _callback(null);
                                                    }
                                                });
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }

                    app.db_connection.beginTransaction(function(_err) {
                        if(_err) {
                            callback(_err);
                        }
                        else {
                            async.series(async_func_list, function(err, results) {
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
                    });
                }, function(err) {
                    callback(err);
                });
            }
            else {
                app.db_connection.beginTransaction(function(_err) {
                    if(_err) {
                        callback(_err);
                    }
                    else {
                        async.series(async_func_list, function(err, results) {
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
                });
            }
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
    async.series([
        //우선 이 그룹 접근 가능 여부를 확인한다.
        function(callback) {
            let queryStr = "SELECT * FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
            let queryVal = [decoded_jwt['uid'], group_id];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    if(rows.length == 0) {
                        error_handler.custom_error_handler(403, 'Only member of this group can get list of orders!', null, next);
                        return;
                    }
                    else {
                        callback(null);
                    }
                }
            });
        },
        //주문 리스트를 조회한다.
        function(callback) {
            var order_list = null;
            var pagination_info = null;

            var total_count_promise = new Promise(function(resolve, reject) {
                let queryStr = "SELECT COUNT(*) AS `check_count` FROM `orders` WHERE `group_id` = ?";
                let queryVal = [group_id];

                if(show_only_my_request == 1) {
                    queryStr += " AND `user_id` = ?";
                    queryVal.push(decoded_jwt['uid']);
                }

                if(show_only_pending == 1) {
                    queryStr += " AND `approve_status` IS NULL";
                }

                if(order_desc == 1) {
                    queryStr += " ORDER BY `id` DESC";
                }
                else {
                    queryStr += " ORDER BY `id` ASC";
                }

                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        reject(err);
                    }
                    else {
                        pagination_info = value_checker.get_pagination_info(page_offset, order_per_page, rows[0].check_count);
                        resolve(null);
                    }
                });
            });

            var order_list_promise = new Promise(function(resolve, reject) {
                let queryStr = "SELECT `orders`.*, `users`.`name` AS `user_name` FROM `orders` INNER JOIN `users` ON ";
                queryStr += "`orders`.`user_id` = `users`.`id` ";
                queryStr += "WHERE `orders`.`group_id` = ?";
                let queryVal = [group_id];

                if(show_only_my_request == 1) {
                    queryStr += " AND `orders`.`user_id` = ?";
                    queryVal.push(decoded_jwt['uid']);
                }

                if(show_only_pending == 1) {
                    queryStr += " AND `orders`.`approve_status` IS NULL";
                }

                if(order_desc == 1) {
                    queryStr += " ORDER BY `id` DESC";
                }
                else {
                    queryStr += " ORDER BY `id` ASC";
                }

                queryStr += " LIMIT ? OFFSET ?";
                queryVal.push(order_per_page);
                queryVal.push(order_per_page * page_offset);

                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        reject(err);
                    }
                    else {
                        order_list = rows;
                        resolve(null);
                    }
                });
            });

            Promise.all([total_count_promise, order_list_promise]).then(function(data) {
                callback(null, {
                    pagination_info: pagination_info,
                    list: order_list
                });

            }, function(err) {
                callback(err);
            });
        }
    ],
    function(err, results) {
        error_handler.async_final(err, res, next, results[1]);
    });
}

exports.request = request;
exports.confirm = confirm;
exports.list = list;