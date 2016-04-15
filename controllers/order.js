'use strict';

var async = require('async');
var app = require('../app');
var unixTime = require('unix-time');
var sha512 = require('sha512');
var value_checker = require('../helper/value_checker');

function request(req, res, next) {

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
    var menus = req.body.menus;
    var table_num = req.body.table_num;

    //빈 값이 있는지 확인.
    var checklist = [group_id, menus, table_num];
    if(value_checker.is_empty_check(checklist)) {
        let custom_err = new Error('Required value is empty!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //음이 아닌 정수인지 확인.
    var num_check_list = [group_id, table_num];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        let custom_err = new Error('GroupID and TableNum must be integer format!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //필요한 정보만 필터링한다.
    var filtered_menu = [];
    for(var i in menus) {
        //메뉴가 잘못된 형식인지 검사한다.
        if(!menus[i].hasOwnProperty('id') || !menus[i].hasOwnProperty('count')) {
            let custom_err = new Error('Wront menu request format!');
            custom_err.status = 400;
            next(custom_err);

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

    //아무것도 주문할 내역이 없는 경우를 필터링.
    if(filtered_menu.length == 0) {
        let custom_err = new Error('There is nothing to order!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //주문 테이블에 추가하는 작업을 진행한다.
    async.waterfall([
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
                        let custom_err = new Error('Only member of this group can request an order!');
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
        //그 다음에는 요청한 메뉴 ID가 현재 그룹과 맞는지 확인한다.
        function(callback) {
            //TODO: 쿼리문 수정 권장 -> `id` IN (2,5) OR FALSE
            var queryStr = "SELECT `id`, `name`, `price`, `is_available` FROM `menus` WHERE `group_id` = ? AND (";
            var queryVal = [group_id];
            for(var i in filtered_menu) {
                queryStr += "`id` = " + app.db_connection.escape(filtered_menu[i].id) + " OR ";
            }
            queryStr += "FALSE)";
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    callback(err);
                }
                else {
                    //TODO: 부정확한 확인 방법임. 다른 방법으로의 수정이 필요함. (아니.. 괜챃은거같기도?)
                    if(rows.length != filtered_menu.length) {
                        let custom_err = new Error('GroupID and MenuID mismatch!');
                        custom_err.status = 403;
                        next(custom_err);

                        return;
                    }
                    else {
                        var deactivated_check = false;
                        var deactivated_error_message = "These menus are not available now!\n";

                        for(var i in rows) {
                            if(rows[i].is_available != 1) {
                                deactivated_check = true;
                                deactivated_error_message += "'ID': " + rows[i].id + ", 'Name': " + rows[i].name + "\n";
                            }
                        }

                        if(deactivated_check == true) {
                            let custom_err = new Error(deactivated_error_message);
                            custom_err.status = 403;
                            next(custom_err);

                            return;
                        }
                        else {
                            callback(null, rows);
                        }
                    }
                }
            });
        },
        //이제 주문 내용을 테이블에 집어넣는다.
        function(target_list, callback) {
            var total_price = 0;
            for(var i in target_list) {
                for(var j in filtered_menu) {
                    if(target_list[i].id == filtered_menu[j].id) {
                        total_price += target_list[i].price * filtered_menu[j].count;
                    }
                }
            }

            var queryStr = "INSERT INTO `orders` SET `user_id` = ?, `group_id` = ?, `content` = ?, `total_price` = ?, `table_num` = ?, `created_at` = ?, `updated_at` = ?";
            var queryVal = [decoded_jwt['uid'], group_id, JSON.stringify(filtered_menu), total_price, table_num, unixTime(new Date()), unixTime(new Date())];
            app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                if(err) {
                    console.log(err);
                    callback(err);
                }
                else {
                    callback(null, rows.insertId);
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
                    insertId: results
                }
            });

            //Socket.IO를 이용하여 실시간으로 업데이트 할 수 있도록 설정함.
            var io = require('./websocket');
            io.socketEventEmitter('Group_' + group_id, 'orderEvent', null);

            return;
        }
    });
}

function confirm(req, res, next) {

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
    var order_id = req.params.order_id;
    var is_approve = (!!req.body.is_approve) ? "1" : "0"; //문자열로 해줘야 밑의 empty check를 통과할 수 있음.

    //빈 값이 있는지 확인.
    var checklist = [order_id, is_approve];
    if(value_checker.is_empty_check(checklist)) {
        let custom_err = new Error('Required value is empty!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //음이 아닌 정수인지 확인.
    var num_check_list = [order_id];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        let custom_err = new Error('OrderID must be integer format!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //SocketIO 사용 때문에 추가.
    var groupId = null;

    //Approve여부에 따라 처리방식이 달라진다.
    if(parseInt(is_approve) == 1) {
        //주문 승인
        async.waterfall([
            //해당 주문에 해당하는 그룹에 이 유저가 속해있는지를 확인한다.
            function(callback) {
                var queryStr = "SELECT `orders`.* FROM `orders` JOIN `members` ON ";
                queryStr += "`members`.`user_id` = ? AND ";
                queryStr += "`members`.`group_id` = `orders`.`group_id` AND ";
                queryStr += "`orders`.`id` = ?";
                var queryVal = [decoded_jwt['uid'], order_id];
                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        if(rows.length == 0) {
                            let custom_err = new Error('Only member of related group can approve this order!');
                            custom_err.status = 403;
                            next(custom_err);

                            return;
                        }
                        else {
                            groupId = rows[0].group_id;
                            callback(null);
                        }
                    }
                });
            },
            //TODO: Transaction 처리가 필요함!
            //주문 내용을 받아온다.
            function(callback) {
                var queryStr = "SELECT `group_id`, `content`, `table_num` FROM `orders` WHERE `id` = ?";
                var queryVal = [order_id];
                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        callback(null, rows[0]);
                    }
                });
            },
            //받아온 내용을 대기열에 삽입한다.
            //TODO: Multiple Statement의 Security Issue에 대해서 확인할 필요가 있음.
            function(order_info, callback) {
                var order_group_id = order_info.group_id;
                var order_content = JSON.parse(order_info.content);
                var order_table_num = order_info.table_num;

                //Multiple statement를 사용함.
                var queryStr = "";
                var queryVal = [];
                for(var i in order_content) {
                    queryStr += "INSERT INTO `waitings` SET `group_id` = ?, `menu_id` = ?, `amount` = ?, `table_num` = ?, `created_at` = ?, `updated_at` = ?;";
                    queryVal.push(order_group_id);
                    queryVal.push(order_content[i].id);
                    queryVal.push(order_content[i].count);
                    queryVal.push(order_table_num);
                    queryVal.push(unixTime(new Date()));
                    queryVal.push(unixTime(new Date()));
                }
                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        callback(null);
                    }
                });
            },
            //주문 상태를 업데이트한다.
            function(callback) {
                var queryStr = "UPDATE `orders` SET `approve_status` = ?, `updated_at` = ? WHERE `id` = ? AND `approve_status` IS NULL";
                var queryVal = [is_approve, unixTime(new Date()), order_id];
                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        if(rows.changedRows == 0) {
                            let custom_err = new Error('Unable to change approve status!');
                            custom_err.status = 403;
                            next(custom_err);

                            return;
                        }
                        else {
                            callback(null);
                        }
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
                io.socketEventEmitter('Group_' + groupId, 'orderEvent', null);
                io.socketEventEmitter('Group_' + groupId, 'queueEvent', null);

                return;
            }
        });
    }
    else {
        //주문 취소
        async.waterfall([
            //해당 주문에 해당하는 그룹에 이 유저가 속해있는지를 확인한다.
            function(callback) {
                var queryStr = "SELECT `orders`.* FROM `orders` JOIN `members` ON ";
                queryStr += "`members`.`user_id` = ? AND ";
                queryStr += "`members`.`group_id` = `orders`.`group_id` AND ";
                queryStr += "`orders`.`id` = ?";
                var queryVal = [decoded_jwt['uid'], order_id];
                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        if(rows.length == 0) {
                            let custom_err = new Error('Only member of related group can approve this order!');
                            custom_err.status = 403;
                            next(custom_err);

                            return;
                        }
                        else {
                            groupId = rows[0].group_id;
                            callback(null);
                        }
                    }
                });
            },
            //주문 상태를 업데이트한다.
            function(callback) {
                var queryStr = "UPDATE `orders` SET `approve_status` = ?, `updated_at` = ? WHERE `id` = ? AND `approve_status` IS NULL";
                var queryVal = [is_approve, unixTime(new Date()), order_id];
                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        if(rows.changedRows == 0) {
                            let custom_err = new Error('Unable to change approve status!');
                            custom_err.status = 403;
                            next(custom_err);

                            return;
                        }
                        else {
                            callback(null);
                        }
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
                io.socketEventEmitter('Group_' + groupId, 'orderEvent', null);

                return;
            }
        });
    }
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

    //선택적 정보 받기.
    var show_only_pending = (req.query.show_only_pending == 1);
    var show_only_my_request = (req.query.show_only_my_requeset == 1);
    var order_per_page = (!!req.query.order_per_page) ? req.query.order_per_page : 20;
    var page_offset = (!!req.query.page_offset) ? req.query.page_offset : 1;

    //음이 아닌 정수인지 확인.
    var num_check_list = [group_id, order_per_page, page_offset];
    if(!value_checker.is_positive_integer_check(num_check_list)) {
        let custom_err = new Error('GroupID and TableNum must be integer format!');
        custom_err.status = 400;
        next(custom_err);

        return;
    }

    //리스트를 조회한다.
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
                        let custom_err = new Error('Only member of this group can request an order!');
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
        //주문 리스트를 조회한다.
        function(callback) {
            var queryStr = "SELECT `orders`.*, `users`.`name` AS `user_name` FROM `orders` JOIN `users` ON `orders`.`group_id` = ?";
            var queryVal = [group_id];

            //대기 중인 것만 보고 싶을 경우
            if(show_only_pending) {
                queryStr += " AND `orders`.`approve_status` IS NULL";
            }

            //내 주문 내역만 보고 싶은 경우
            if(show_only_my_request) {
                queryStr += " AND `orders`.`user_id` = ?";
                queryVal.push(decoded_jwt['uid']);
            }

            //보여줄 결과를 제한한다.
            page_offset  = (page_offset - 1 >= 0) ? page_offset - 1 : 0;
            queryStr += " AND `orders`.`user_id`=`users`.`id` LIMIT ? OFFSET ?";
            queryVal.push(order_per_page);
            queryVal.push(page_offset * order_per_page);

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
            for(var i in results[1]) {
                results[1][i].content = JSON.parse(results[1][i].content);
            }

            res.jsonp({
                state: true,
                mesasge: "OK",
                data: results[1]
            });

            return;
        }
    });
}

exports.request = request;
exports.confirm = confirm;
exports.list = list;