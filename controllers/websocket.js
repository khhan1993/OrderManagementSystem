'use strict';

var value_checker = require('../helper/value_checker');
var async = require('async');
var app = require('../app');
var io = require('socket.io')(require('../bin/www').httpsServer);

//분산처리 시 데이터 공유를 위해 추가.
var io_redis = require('socket.io-redis');
io.adapter(io_redis({ host: 'localhost', port: 6379 })); //접속 정보는 자신의 상황에 맞게 설정할 것!

io.on('connection', function (socket) {

    socket.on('selectGroup', function(data) {
        //그룹 지정을 위한 정보를 받는다.
        var selected_group = data.selected_group;
        var access_token = data.access_token;

        //JWT를 검증한다.
        var decoded_jwt = value_checker.jwt_checker(access_token);
        if(decoded_jwt == null)
            return;

        //지정한 그룹의 멤버인지 확인한다.
        async.series([
            function(callback) {
                var queryStr = "SELECT COUNT(*) AS `check_count` FROM `members` WHERE `user_id` = ? AND `group_id` = ?";
                var queryVal = [decoded_jwt['uid'], selected_group];
                app.db_connection.query(queryStr, queryVal, function(err, rows, fields) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        if(rows[0].check_count > 0) {
                            callback(null);
                        }
                    }
                });
            }
        ],
        function(err, results) {
            if(err) {
                io.sockets.to(socket.id).emit('error', 'Database query error!');
            }
            else {
                for(var i in socket.rooms) {
                    if(socket.rooms[i] != socket.id) {
                        socket.leave(socket.rooms[i]);
                    }
                }
                socket.join('Group_' + selected_group);
            }
        });
    });
});

exports.socketEventEmitter = function(group_name, key, data) {
    io.sockets.to(group_name).emit(key, data);
};