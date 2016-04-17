'use strict';

var OMS = angular.module('OMS', ['ui.router', 'ngCookies']);

OMS.config(function($stateProvider, $urlRouterProvider, $locationProvider) {

    $urlRouterProvider.otherwise("/");
    $locationProvider.html5Mode(true);

    $stateProvider
        .state('home', {
            url: '/',
            templateUrl: 'template/home.html'
        })
        .state('group', {
            abstract: true,
            url: '/group',
            templateUrl: 'template/group/base.html'
        })
        .state('group.create', {
            url: '/create',
            templateUrl: 'template/group/create.html',
            controller: 'createGroupController'
        })
        .state('group.current', {
            url: '/current',
            templateUrl: 'template/group/current.html',
            controller: 'currentGroupController'
        })
        .state('order', {
            abstract: true,
            url: '/order',
            templateUrl: 'template/order/base.html'
        })
        .state('order.request', {
            url: '/request',
            templateUrl: 'template/order/request.html',
            controller: 'orderRequestController'
        })
        .state('order.confirm', {
            url: '/confirm',
            templateUrl: 'template/order/confirm.html',
            controller: 'orderConfirmController'
        })
        .state('order.status', {
            url: '/status',
            templateUrl: 'template/order/status.html',
            controller: 'orderStatusController'
        })
        .state('statistics', {
            abstract: true,
            url: '/statistics',
            templateUrl: 'template/statistics/base.html'
        })
        .state('statistics.queue', {
            url: '/queue',
            templateUrl: 'template/statistics/queue.html',
            controller: 'queueStatisticsController'
        })
        .state('manage', {
            abstract: true,
            url: '/manage',
            templateUrl: 'template/manage/base.html'
        })
        .state('manage.member', {
            url: '/member',
            templateUrl: 'template/manage/member.html',
            controller: 'memberManageController'
        })
        .state('manage.menu', {
            url: '/menu',
            templateUrl: 'template/manage/menu.html',
            controller: 'menuManageController'
        })
        .state('auth', {
            abstract: true,
            url: '/auth',
            templateUrl: 'template/auth/base.html'
        })
        .state('auth.login', {
            url: '/login',
            templateUrl: 'template/auth/login.html',
            controller: 'loginController'
        })
        .state('auth.register', {
            url: '/register',
            templateUrl: 'template/auth/register.html',
            controller: 'registerController'
        });
});

OMS.controller('topNavbarController', function($rootScope, $scope, $http, $cookies, $state) {
    $scope.logout = function() {
        $cookies.remove('access_token');
        $cookies.remove('selected_group');
        $state.go('home');
        $rootScope.is_access_token_set = !!$cookies.get('access_token');
        while($rootScope.group_list.length > 0) {
            $rootScope.group_list.pop();
        }
        $rootScope.selected_group = null;
    };

    $rootScope.is_access_token_set = !!$cookies.get('access_token');
    $rootScope.group_list = [];
    $rootScope.get_group_list = function() {
        if(!!$cookies.get('access_token')) {
            $http({
                method: 'GET',
                url: '/api/group/list',
                headers: {
                    Authorization: $cookies.get('access_token')
                }
            }).then(function successCallback(response) {
                while($rootScope.group_list.length > 0) {
                    $rootScope.group_list.pop();
                }

                $rootScope.group_list = response.data.data;
            }, function errorCallback(response) {
                alert(response.data.message);
            });
        }
    };

    $rootScope.selected_group = (!$cookies.get('selected_group')) ? null : $cookies.get('selected_group');
    $rootScope.select_group = function(group_id) {
        $rootScope.selected_group = group_id;
        $cookies.put('selected_group', group_id);
        $state.go('group.current');
        if(!!$rootScope.get_group_info) {
            $rootScope.get_group_info();
        }
        $rootScope.webSocket.emit('selectGroup', {
            'selected_group': $rootScope.selected_group,
            'access_token': (!$cookies.get('access_token')) ? null : $cookies.get('access_token')
        });
    };

    $rootScope.get_group_list();

    $rootScope.get_time_text = function(unixtime) {
        var reg_date = new Date(unixtime * 1000);
        return reg_date.getFullYear() + "년 " + reg_date.getMonth() + "월 " + reg_date.getDate() + "일 " + reg_date.getHours() + "시 " + reg_date.getMinutes() + "분";
    };

    $rootScope.webSocket = io();
    if($rootScope.selected_group != null) {
        $rootScope.webSocket.emit('selectGroup', {
            'selected_group': $rootScope.selected_group,
            'access_token': (!$cookies.get('access_token')) ? null : $cookies.get('access_token')
        });
    }
    
    $rootScope.webSocket.on('disconnect', function() {
        alert('서버와의 연결이 끊어졌습니다! 새로고침을 해 주세요.');
    });
    
    $rootScope.webSocket.on('error', function(msg) {
        alert(msg);
    });
});

OMS.controller('loginController', function($rootScope, $scope, $http, $cookies, $state) {
    $scope.login = function() {
        $http({
            method: 'POST',
            url: '/api/auth/signin',
            data: {
                email: $scope.email,
                password: $scope.password
            }
        }).then(function successCallback(response) {
            var validDate = new Date();
            validDate.setHours(validDate.getHours() + 12);
            $cookies.put('access_token', response.data.data, {
                expires: validDate
            });
            alert('Login success!');
            $state.go('home');
            $rootScope.is_access_token_set = !!$cookies.get('access_token');

            $rootScope.get_group_list();
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };
    
    $scope.email = null;
    $scope.password = null;
});

OMS.controller('registerController', function($scope, $http, $state) {
    $scope.register = function() {
        $http({
            method: 'POST',
            url: '/api/auth/signup',
            data: {
                name: $scope.name,
                email: $scope.email,
                password: $scope.password
            }
        }).then(function successCallback(response) {
            alert('Register complete!');
            $state.go('home');
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.name = null;
    $scope.email = null;
    $scope.password = null;
});

OMS.controller('createGroupController', function($rootScope, $scope, $http, $state, $cookies) {
    $scope.create = function() {
        $http({
            method: 'POST',
            url: '/api/group/create',
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                name: $scope.name
            }
        }).then(function successCallback(response) {
            alert('Requested group is successfully created!');
            $rootScope.get_group_list();
            $state.go('home');
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.name = null;
});

OMS.controller('currentGroupController', function($rootScope, $scope, $http, $state, $cookies, $interval) {

    var user_info = null;
    var group_info = null;

    $rootScope.get_group_info = function() {
        $http({
            method: 'GET',
            url: '/api/group/info/' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            user_info = response.data.data.user_info;

            $scope.user_uid = user_info.uid;
            $scope.user_name = (user_info.name);
            $scope.user_email = user_info.email;
            $scope.user_ip_address = user_info.ip_address;

            group_info = response.data.data.group_info;
            var group_creation_dateObj = new Date(group_info.created_at * 1000);

            $scope.group_id = group_info.id;
            $scope.group_name = group_info.group_name;
            $scope.group_creator = group_info.creator_name;
            $scope.group_creation_date = group_creation_dateObj.getFullYear() + "년 " + group_creation_dateObj.getMonth() + "월 " + group_creation_dateObj.getDate() + "일 " + group_creation_dateObj.getHours() + "시 " + group_creation_dateObj.getMinutes() + "분";
            $scope.num_of_group_members = response.data.data.num_of_group_members;

        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $rootScope.get_group_info();

    var token_valid_timer = $interval(function() {
        var remain_unixtime = parseInt(user_info.exp - ((new Date()).getTime() / 1000));

        var hours = parseInt(remain_unixtime / 3600);
        var minutes = parseInt((remain_unixtime % 3600) / 60);
        var seconds = parseInt(remain_unixtime % 60);

        $scope.user_exp = hours + "시간 " + minutes + "분 " + seconds + "초";
        if(remain_unixtime <= 0 || !$cookies.get('access_token') || !$cookies.get('selected_group')) {
            $interval.cancel(token_valid_timer);
        }
    }, 1000);
});

OMS.controller('orderRequestController', function($rootScope, $scope, $http, $state, $cookies) {
    $scope.get_menu_list = function() {
        $http({
            method: 'GET',
            url: '/api/menu/list?group_id=' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            $scope.menus = response.data.data;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };
    
    $scope.menu_count_plus = function(menu) {
        menu.count += 1;
        $scope.total_price += menu.price;
    };

    $scope.menu_count_minus = function(menu) {
        menu.count -= 1;
        if(menu.count < 0) {
            menu.count = 0;
        }
        else {
            $scope.total_price -= menu.price;
        }
    };

    $scope.menu_count_reset = function(menu) {
        $scope.total_price -= (menu.price * menu.count);
        menu.count = 0;
    };

    $scope.order_request = function() {
        $http({
            method: 'POST',
            url: '/api/order/request',
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                group_id: $cookies.get('selected_group'),
                menus: $scope.menus,
                table_num: $scope.table_num
            }
        }).then(function successCallback(response) {
            alert("주문 요청이 완료되었습니다.\n주문번호는 " + response.data.data.insertId + "번 입니다.");
            $scope.get_menu_list();
            $scope.total_price = 0;
            $scope.table_num = null;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.total_price = 0;
    $scope.table_num = null;
    
    $scope.get_menu_list();

    $rootScope.webSocket.on('menuEvent', function(data) {
        if($state.is('order.request')) {
            $scope.get_menu_list();
        }
    });
});

OMS.controller('orderConfirmController', function($rootScope, $scope, $http, $state, $cookies) {
    $scope.get_pending_list = function() {
        $http({
            method: 'GET',
            url: '/api/order/list?group_id=' + $cookies.get('selected_group') + '&show_only_pending=1',
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            $scope.pending_list = response.data.data;
            $scope.current_unixtime = parseInt((new Date()).getTime() / 1000);
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.get_elapsed_time_text = function(seconds) {
        return parseInt(seconds / 60) + "분 " + parseInt(seconds % 60) + "초";
    };

    $scope.update_pending_data = function(order_id, is_approve) {
        var confirm_check_message = "주문번호 " + order_id + "을(를) " + ((is_approve == true) ? "승인" : "취소") + "하시겠습니까?";
        if(confirm(confirm_check_message)) {
            $http({
                method: 'POST',
                url: '/api/order/confirm/' + order_id,
                headers: {
                    Authorization: $cookies.get('access_token')
                },
                data: {
                    is_approve: is_approve
                }
            }).then(function successCallback(response) {
                $scope.get_pending_list();
            }, function errorCallback(response) {
                alert(response.data.message);
            });
        }
    };
    
    $scope.show_order_content = function(data) {
        var content_text = "주문번호: " + data.id + "\n";
        content_text += "주문자명: " + data.user_name + "\n";
        content_text += "주문 총액: " + data.total_price + "\n";
        content_text += "테이블 번호: " + data.table_num + "\n";
        content_text += "주문 시간: " + $rootScope.get_time_text(data.created_at) + "\n";
        content_text += "\n[주문 내역]\n";
        for(var i in data.content) {
            content_text += data.content[i].name + " " + data.content[i].count + "개\n";
        }
        alert(content_text);
    };

    $scope.get_pending_list();

    $rootScope.webSocket.on('orderEvent', function(data) {
        if($state.is('order.confirm')) {
            $scope.get_pending_list();
        }
    });
});

OMS.controller('orderStatusController', function($rootScope, $scope, $http, $state, $cookies) {
    $scope.get_order_list = function() {
        $http({
            method: 'GET',
            url: '/api/order/list?group_id=' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            $scope.order_list = response.data.data;
            $scope.order_list.sort(function(a, b) { return b.id - a.id});
            $scope.current_unixtime = parseInt((new Date()).getTime() / 1000);
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.get_elapsed_time_text = function(seconds) {
        return parseInt(seconds / 60) + "분 " + parseInt(seconds % 60) + "초";
    };

    $scope.show_order_content = function(data) {
        var content_text = "주문번호: " + data.id + "\n";
        content_text += "주문자명: " + data.user_name + "\n";
        content_text += "주문 총액: " + data.total_price + "\n";
        content_text += "테이블 번호: " + data.table_num + "\n";
        content_text += "주문 시간: " + $rootScope.get_time_text(data.created_at) + "\n";
        content_text += "\n[주문 내역]\n";
        for(var i in data.content) {
            content_text += data.content[i].name + " " + data.content[i].count + "개\n";
        }
        alert(content_text);
    };

    $scope.get_order_list();

    $rootScope.webSocket.on('orderEvent', function(data) {
        if($state.is('order.status')) {
            $scope.get_order_list();
        }
    });
});

OMS.controller('queueStatisticsController', function($rootScope, $scope, $http, $state, $cookies) {

    $scope.get_queue_information = function() {
        $http({
            method: 'GET',
            url: '/api/statistics/queue?group_id=' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            var order_price_list = response.data.data.order_price_list;
            var waitings = response.data.data.waitings;

            $scope.total_sales = 0;
            for(var i in order_price_list) {
                $scope.total_sales += order_price_list[i].total_price;
            }

            $scope.menu_list = response.data.data.menu_list;
            for(var i in $scope.menu_list) {
                $scope.menu_list[i].total_sale_count = 0;
                $scope.menu_list[i].current_waiting_count = 0;
                $scope.menu_list[i].queue = [];
            }

            for(var i in waitings) {
                for(var j in $scope.menu_list) {
                    if($scope.menu_list[j].id == waitings[i].menu_id) {
                        $scope.menu_list[j].total_sale_count += waitings[i].amount;
                        if(waitings[i].is_served == 0) {
                            $scope.menu_list[j].current_waiting_count += waitings[i].amount;
                            $scope.menu_list[j].queue.push({
                                id: waitings[i].id,
                                content: "T" + waitings[i].table_num + " / " + waitings[i].amount + "개"
                            });
                        }

                        break;
                    }
                }
            }
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };
    
    $scope.update_waiting_status = function(menu_data, waiting_data) {
        var confirm_check_message = "[" + menu_data.name + "] 메뉴 대기열에서 [" + waiting_data.content + "]를 제거하시겠습니까?";
        if(confirm(confirm_check_message)) {
            $http({
                method: 'POST',
                url: '/api/statistics/clear_waiting/' + waiting_data.id,
                headers: {
                    Authorization: $cookies.get('access_token')
                }
            }).then(function successCallback(response) {
                //Socket Event로 새로고침하기 때문에 여기서 따로 할 것은 없다.
            }, function errorCallback(response) {
                alert(response.data.message);
            });
        }
    };

    $scope.get_queue_information();

    $rootScope.webSocket.on('queueEvent', function(data) {
        if($state.is('statistics.queue')) {
            $scope.get_queue_information();
        }
    });
});

OMS.controller('memberManageController', function($rootScope, $scope, $http, $state, $cookies) {
    
    $scope.get_member_list = function() {
        $http({
            method: 'GET',
            url: '/api/group/members?group_id=' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            $scope.members = response.data.data;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.add_new_member = function() {
        $http({
            method: 'POST',
            url: '/api/group/join',
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                user_id: $scope.user_id,
                email: $scope.user_email,
                group_id: $cookies.get('selected_group')
            }
        }).then(function successCallback(response) {
            $scope.user_email = null;
            $scope.get_member_list();
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };
    
    $scope.remove_exist_member = function() {
        alert('아직 지원하지 않는 기능입니다.');
    };

    $scope.user_email = null;

    $scope.get_member_list();
});

OMS.controller('menuManageController', function($rootScope, $scope, $http, $state, $cookies) {

    $scope.update_menu_price = function(menuObj, state) {
        $http({
            method: 'POST',
            url: '/api/menu/update/' + menuObj.id,
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                price: menuObj.price,
                is_available: state
            }
        }).then(function successCallback(response) {
            //menuObj.is_available = !menuObj.is_available;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.update_menu_state = function(menuObj, state) {
        $http({
            method: 'POST',
            url: '/api/menu/update/' + menuObj.id,
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                price: menuObj.price,
                is_available: state
            }
        }).then(function successCallback(response) {
            menuObj.is_available = !menuObj.is_available;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.get_menu_list = function() {
        $http({
            method: 'GET',
            url: '/api/menu/list?group_id=' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            $scope.menus = response.data.data;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.add_new_menu = function() {
        $http({
            method: 'POST',
            url: '/api/menu/create',
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                name: $scope.new_memu_name,
                price: $scope.new_menu_price,
                group_id: $cookies.get('selected_group')
            }
        }).then(function successCallback(response) {
            $scope.new_memu_name = null;
            $scope.new_menu_price = null;
            $scope.get_menu_list();
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.new_memu_name = null;
    $scope.new_menu_price = null;

    $scope.get_menu_list();
});