"use strict";

$.material.init();

var OMS = angular.module('OMS', ['ui.router', 'ngRoute', 'ngCookies']);

OMS.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
    $urlRouterProvider.otherwise("/");
    $locationProvider.html5Mode(true);

    $stateProvider
        .state('home', {
            url: '/',
            templateUrl: 'template/home.html',
            controller: 'homeController'
        })
        .state('me', {
            abstract: true,
            url: '/me',
            templateUrl: 'template/base.html'
        })
        .state('me.info', {
            url: '/info',
            templateUrl: 'template/me/info.html',
            controller: 'myinfoController'
        })
        .state('auth', {
            abstract: true,
            url: '/auth',
            templateUrl: 'template/base.html'
        })
        .state('auth.signin', {
            url: '/signin',
            templateUrl: 'template/auth/signin.html',
            controller: 'signinController'
        })
        .state('auth.signup', {
            url: '/signup',
            templateUrl: 'template/auth/signup.html',
            controller: 'signupController'
        })
        .state('group', {
            abstract: true,
            url: '/group',
            templateUrl: 'template/base.html'
        })
        .state('group.list_and_create', {
            url: '/list_and_create',
            templateUrl: 'template/group/list_and_create.html',
            controller: 'listAndCreateGroupController'
        })
        .state('group.info', {
            url: '/info',
            templateUrl: 'template/group/info.html',
            controller: 'getCurrentGroupInfoController'
        })
        .state('order', {
            abstract: true,
            url: '/order',
            templateUrl: 'template/base.html'
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
        .state('order.list', {
            url: '/list',
            templateUrl: 'template/order/list.html',
            controller: 'orderListController'
        })
        .state('statistics', {
            abstract: true,
            url: '/statistics',
            templateUrl: 'template/base.html'
        })
        .state('statistics.waiting', {
            url: '/waiting',
            templateUrl: 'template/statistics/waiting.html',
            controller: 'statisticsWaitingController'
        })
        .state('manage', {
            abstract: true,
            url: '/manage',
            templateUrl: 'template/base.html'
        })
        .state('manage.menu', {
            url: '/menu',
            templateUrl: 'template/manage/menu.html',
            controller: 'manageMenuController'
        })
        .state('manage.setmenu', {
            url: '/setmenu',
            templateUrl: 'template/manage/setmenu.html',
            controller: 'manageSetMenuController'
        })
        .state('manage.member', {
            url: '/member',
            templateUrl: 'template/manage/member.html',
            controller: 'manageMemberController'
        });
});

var autoRefreshTime = 10000;
var stopRefreshCheck = 500;

OMS.controller('navbarController', function($rootScope, $scope, $http, $cookies, $state, $interval) {

    //로그인 상태를 감지하고 실시간으로 반영하기 위한 것이다.
    var authStateTrack = $interval(function() {
        $rootScope.is_authenticated = (!!$cookies.get('access_token'));
        $rootScope.is_group_selected = (!!$cookies.get('selected_group'));
        if($rootScope.is_authenticated) {
            $rootScope.decoded_token = JSON.parse(atob(($cookies.get('access_token')).split('.')[1]));
        }
        else {
            $rootScope.decoded_token = null;

            if(!$state.is('auth.signin') && !$state.is('auth.signup')) {
                $state.go('auth.signin');
            }
        }
    }, 250);

    $scope.signout = function() {

        if(confirm('로그아웃 하시겠습니까?')) {
            if($cookies.get('access_token')) {
                $cookies.remove('access_token');
            }

            if($cookies.get('selected_group')) {
                $cookies.remove('selected_group');
            }

            $state.go('home');
            $rootScope.is_authenticated = (!!$cookies.get('access_token'));
        }
    };

    $rootScope.scope_parseInt = function(numeric_val) {
        return parseInt(numeric_val);
    };

    $rootScope.getDateTimeText = function(dateObj) {

        if(dateObj == null) {
            return "-";
        }

        var target_date = new Date(dateObj);

        var year = target_date.getFullYear();
        var month = target_date.getMonth() + 1;
        var date = target_date.getDate();
        var hour = target_date.getHours();
        var minute = target_date.getMinutes();

        return year + "년 " + month + "월 " + date + "일 " + hour + "시 " + minute + "분";
    };
});

OMS.controller('homeController', function($rootScope, $state) {
    if($rootScope.is_authenticated) {
        $state.go('group.list_and_create');
    }
    else {
        $state.go('auth.signin');
    }
});

OMS.controller('signinController', function($rootScope, $scope, $http, $cookies, $state) {
    $scope.signin = function() {
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
            $state.go('home');
            $rootScope.is_authenticated = !!$cookies.get('access_token');
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    }
});

OMS.controller('signupController', function($scope, $http) {
    $scope.signup = function() {
        $http({
            method: 'POST',
            url: '/api/auth/signup',
            data: {
                name: $scope.name,
                email: $scope.email,
                password: $scope.password
            }
        }).then(function successCallback(response) {
            alert('회원가입이 완료되었습니다.');
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };
});

OMS.controller('myinfoController', function($scope, $http, $cookies) {
    $http({
        method: 'GET',
        url: '/api/user/myinfo?group_id=' + ((!!$cookies.get('selected_group')) ? $cookies.get('selected_group') : 0),
        headers: {
            Authorization: $cookies.get('access_token')
        }
    }).then(function successCallback(response) {
        $scope.user_info = response.data.data.user_info;
        $scope.group_related_info = response.data.data.group_related_info;
    }, function errorCallback(response) {
        alert(response.data.message);
    });
});

OMS.controller('listAndCreateGroupController', function($rootScope, $scope, $http, $cookies) {

    $scope.getGroupList = function() {
        $http({
            method: 'GET',
            url: '/api/group/list',
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            $scope.group_list = response.data.data;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.getGroupList();

    $scope.selected_group = $cookies.get('selected_group');

    $scope.select_group = function(group_id) {
        var validDate = new Date();
        validDate.setHours(validDate.getHours() + 12);
        $cookies.put('selected_group', group_id, {
            expires: validDate
        });

        $scope.selected_group = $cookies.get('selected_group');
    };

    $scope.new_group_name = null;

    $scope.createNewGroup = function() {
        $http({
            method: 'POST',
            url: '/api/group/create',
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                name: $scope.new_group_name
            }
        }).then(function successCallback(response) {
            alert('그룹이 생성되었습니다!');
            $scope.new_group_name = null;
            $scope.getGroupList();
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };
});

OMS.controller('getCurrentGroupInfoController', function($scope, $http, $cookies) {

    $http({
        method: 'GET',
        url: '/api/group/info/' + $cookies.get('selected_group'),
        headers: {
            Authorization: $cookies.get('access_token')
        }
    }).then(function successCallback(response) {
        $scope.group_info = response.data.data;
    }, function errorCallback(response) {
        alert(response.data.message);
    });

});

OMS.controller('orderRequestController', function($scope, $http, $state, $cookies, $interval) {

    $scope.getNewList = function() {
        $http({
            method: 'GET',
            url: '/api/menu/list?group_id=' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            var menu_list_for_convert = response.data.data;
            for(var i in menu_list_for_convert) {
                menu_list_for_convert[i].count = 0;
            }
            $scope.menu_list = menu_list_for_convert;
        }, function errorCallback(response) {
            alert(response.data.message);
        });

        $http({
            method: 'GET',
            url: '/api/setmenu/list?group_id=' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            var setmenu_list_for_convert = response.data.data;
            for(var i in setmenu_list_for_convert) {
                setmenu_list_for_convert[i].count = 0;
            }
            $scope.setmenu_list = setmenu_list_for_convert;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.getNewList();

    var autoRefresh = $interval(function() {
        $http({
            method: 'GET',
            url: '/api/menu/list?group_id=' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            var menu_list_for_convert = response.data.data;

            for(var j in menu_list_for_convert) {
                menu_list_for_convert[j].count = 0;
            }

            if($scope.menu_list.length != menu_list_for_convert.length) {
                $scope.menu_list = menu_list_for_convert;
            }
            else {
                var length = menu_list_for_convert.length;

                for(var i = 0; i < length; i++) {
                    var check = true;
                    check = ($scope.menu_list[i].id == menu_list_for_convert[i].id);
                    check = ($scope.menu_list[i].name == menu_list_for_convert[i].name);
                    check = ($scope.menu_list[i].price == menu_list_for_convert[i].price);
                    check = ($scope.menu_list[i].is_available == menu_list_for_convert[i].is_available);

                    if(!check) {
                        alert('메뉴 상태가 변경되었습니다!');
                        $scope.menu_list = menu_list_for_convert;
                    }
                }
            }
        }, function errorCallback(response) {
            alert(response.data.message);
        });

        $http({
            method: 'GET',
            url: '/api/setmenu/list?group_id=' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            var setmenu_list_for_convert = response.data.data;
            for(var j in setmenu_list_for_convert) {
                setmenu_list_for_convert[j].count = 0;
            }

            if($scope.setmenu_list.length != setmenu_list_for_convert.length) {
                $scope.setmenu_list = setmenu_list_for_convert;
            }
            else {
                var length = setmenu_list_for_convert.length;

                for(var i = 0; i < length; i++) {
                    var check = true;
                    check = ($scope.setmenu_list[i].id == setmenu_list_for_convert[i].id);
                    check = ($scope.setmenu_list[i].name == setmenu_list_for_convert[i].name);
                    check = ($scope.setmenu_list[i].price == setmenu_list_for_convert[i].price);
                    check = ($scope.setmenu_list[i].is_available == setmenu_list_for_convert[i].is_available);

                    if(!check) {
                        alert('세트메뉴 상태가 변경되었습니다!');
                        $scope.setmenu_list = setmenu_list_for_convert;
                    }
                }
            }
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    }, autoRefreshTime * 2);

    var stopRefreshCheck = $interval(function() {
        if(!$state.is('order.request')) {
            $interval.cancel(autoRefresh);
            $interval.cancel(stopRefreshCheck);
        }
    }, stopRefreshCheck);

    $scope.total_price = 0;
    $scope.table_num = null;

    $scope.requestOrder = function() {
        $http({
            method: 'POST',
            url: '/api/order/request',
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                group_id: $cookies.get('selected_group'),
                menus: $scope.menu_list,
                setmenus: $scope.setmenu_list,
                table_num: $scope.table_num
            }
        }).then(function successCallback(response) {
            alert("주문 요청이 완료되었습니다.\n주문번호는 " + response.data.data + "번 입니다.");
            $scope.getNewList();
            $scope.total_price = 0;
            $scope.table_num = null;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.updateMenuCount = function(menu_obj, count) {
        if(count < 0){
            count = 0;
        }

        $scope.total_price -= parseInt(menu_obj.price * menu_obj.count);
        menu_obj.count = count;
        $scope.total_price += parseInt(menu_obj.price * menu_obj.count);
    };

    $scope.updateSetMenuCount = function(setmenu_obj, count) {
        if(count < 0){
            count = 0;
        }

        $scope.total_price -= parseInt(setmenu_obj.price * setmenu_obj.count);
        setmenu_obj.count = count;
        $scope.total_price += parseInt(setmenu_obj.price * setmenu_obj.count);
    };
});

OMS.controller('orderConfirmController', function($rootScope, $scope, $http, $cookies, $interval, $state) {
    $scope.current_page_num = 1;

    $scope.getPendingList = function() {
        $http({
            method: 'GET',
            url: '/api/order/list?group_id=' + $cookies.get('selected_group') + '&show_only_pending=1&page_offset=' + $scope.current_page_num,
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            $scope.pending_list = response.data.data.list;
            $scope.pagination_info = response.data.data.pagination_info;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.getPendingList();

    var autoRefresh = $interval(function() {
        $scope.getPendingList();
    }, autoRefreshTime);

    var stopRefreshCheck = $interval(function() {
        if(!$state.is('order.confirm')) {
            $interval.cancel(autoRefresh);
            $interval.cancel(stopRefreshCheck);
        }
    }, stopRefreshCheck);

    $scope.show_order_content = function(data) {
        var content_text = "주문번호: " + data.id + "\n";
        content_text += "주문자명: " + data.user_name + "\n";
        content_text += "주문 총액: " + data.total_price + "\n";
        content_text += "테이블 번호: " + data.table_num + "\n";
        content_text += "주문 시간: " + $rootScope.getDateTimeText(data.createdAt) + "\n";
        content_text += "\n[일반 주문 내역]\n";

        data.content = JSON.parse(data.content);
        data.set_content = JSON.parse(data.set_content);

        for(var i in data.content) {
            content_text += data.content[i].name + " " + data.content[i].count + "개\n";
        }
        content_text += "\n[세트 주문 내역]\n";
        for(var i in data.set_content) {
            content_text += data.set_content[i].name + " " + data.set_content[i].count + "개\n";
        }
        alert(content_text);

        data.content = JSON.stringify(data.content);
        data.set_content = JSON.stringify(data.set_content);
    };

    $scope.update_pending_data = function(order_id, approve_status) {

        var confirm_check_message = "주문번호 " + order_id + "을(를) " + ((approve_status == true) ? "승인" : "취소") + "하시겠습니까?";
        if(confirm(confirm_check_message)) {
            $http({
                method: 'POST',
                url: '/api/order/confirm/' + order_id,
                headers: {
                    Authorization: $cookies.get('access_token')
                },
                data: {
                    is_approve: approve_status
                }
            }).then(function successCallback(response) {
                $scope.getPendingList();
            }, function errorCallback(response) {
                alert(response.data.message);
            });
        }
    };

    $scope.gotoPrevPage = function() {
        if(!$scope.pagination_info.prev_active)
            return;

        $scope.current_page_num -= 1;
        $scope.getPendingList();
    };

    $scope.gotoNextPage = function() {
        if(!$scope.pagination_info.next_active)
            return;

        $scope.current_page_num += 1;
        $scope.getPendingList();
    };

    $scope.gotoSpecificPage = function(page_num) {
        $scope.current_page_num = page_num;
        $scope.getPendingList();
    };
});

OMS.controller('orderListController', function($rootScope, $scope, $http, $cookies, $interval, $state) {
    $scope.current_page_num = 1;
    $scope.show_only_my_request = 0;

    $scope.changeShowOnlyMyListState = function() {
        $scope.show_only_my_request = ($scope.show_only_my_request == 0)? 1 : 0;
        $scope.getOrderList();
    };

    $scope.getOrderList = function() {
        $http({
            method: 'GET',
            url: '/api/order/list?group_id=' + $cookies.get('selected_group') + '&order_desc=1&show_only_my_request=' + (($scope.show_only_my_request) ? 1 : 0) + "&page_offset=" + $scope.current_page_num,
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            $scope.order_list = response.data.data.list;
            $scope.pagination_info = response.data.data.pagination_info;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.getOrderList();

    var autoRefresh = $interval(function() {
        $scope.getOrderList();
    }, autoRefreshTime);

    var stopRefreshCheck = $interval(function() {
        if(!$state.is('order.list')) {
            $interval.cancel(autoRefresh);
            $interval.cancel(stopRefreshCheck);
        }
    }, stopRefreshCheck);

    $scope.show_order_content = function(data) {
        var content_text = "주문번호: " + data.id + "\n";
        content_text += "주문자명: " + data.user_name + "\n";
        content_text += "주문 총액: " + data.total_price + "\n";
        content_text += "테이블 번호: " + data.table_num + "\n";
        content_text += "주문 시간: " + $rootScope.getDateTimeText(data.createdAt) + "\n";
        content_text += "\n[일반 주문 내역]\n";

        data.content = JSON.parse(data.content);
        data.set_content = JSON.parse(data.set_content);
        
        for(var i in data.content) {
            content_text += data.content[i].name + " " + data.content[i].count + "개\n";
        }
        content_text += "\n[세트 주문 내역]\n";
        for(var i in data.set_content) {
            content_text += data.set_content[i].name + " " + data.set_content[i].count + "개\n";
        }
        alert(content_text);

        data.content = JSON.stringify(data.content);
        data.set_content = JSON.stringify(data.set_content);
    };

    $scope.gotoPrevPage = function() {
        if(!$scope.pagination_info.prev_active)
            return;

        $scope.current_page_num -= 1;
        $scope.getOrderList();
    };

    $scope.gotoNextPage = function() {
        if(!$scope.pagination_info.next_active)
            return;

        $scope.current_page_num += 1;
        $scope.getOrderList();
    };

    $scope.gotoSpecificPage = function(page_num) {
        $scope.current_page_num = page_num;
        $scope.getOrderList();
    };
});

OMS.controller('statisticsWaitingController', function($rootScope, $scope, $http, $cookies, $interval, $state) {

    $scope.getWaitingList = function() {
        $http({
            method: 'GET',
            url: '/api/statistics/waiting/list?group_id=' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            $scope.menu_list = response.data.data.menu_list;

            for(var i in $scope.menu_list) {
                $scope.menu_list[i].total_count = 0;
                $scope.menu_list[i].waiting_count = 0;
                $scope.menu_list[i].waiting_list = [];

                for(var j in response.data.data.waitings) {
                    if($scope.menu_list[i].id == response.data.data.waitings[j].menu_id) {
                        $scope.menu_list[i].total_count += response.data.data.waitings[j].amount;

                        if(response.data.data.waitings[j].is_served == 0) {
                            $scope.menu_list[i].waiting_count += response.data.data.waitings[j].amount;
                            if($scope.menu_list[i].waiting_list.length < 5) {
                                $scope.menu_list[i].waiting_list.push({
                                    id: response.data.data.waitings[j].id,
                                    content: "T" + response.data.data.waitings[j].table_num + " / " + response.data.data.waitings[j].amount + "개"
                                });
                            }
                            else if($scope.menu_list[i].waiting_list.length == 5) {
                                $scope.menu_list[i].waiting_list.push({
                                    id: null,
                                    content: "(더 있음)"
                                });
                            }
                        }
                    }
                }
            }

        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.getWaitingList();

    var autoRefresh = $interval(function() {
        $scope.getWaitingList();
    }, autoRefreshTime);

    var stopRefreshCheck = $interval(function() {
        if(!$state.is('statistics.waiting')) {
            $interval.cancel(autoRefresh);
            $interval.cancel(stopRefreshCheck);
        }
    }, stopRefreshCheck);

    $scope.update_waiting_status = function(menu_data, waiting_data) {
        if(waiting_data.id == null)
            return;

        var confirm_check_message = "[" + menu_data.name + "] 메뉴 대기열에서 [" + waiting_data.content + "]를 제거하시겠습니까?";
        if(confirm(confirm_check_message)) {
            $http({
                method: 'POST',
                url: '/api/statistics/waiting/clear/' + waiting_data.id,
                headers: {
                    Authorization: $cookies.get('access_token')
                }
            }).then(function successCallback(response) {
                $scope.getWaitingList();
            }, function errorCallback(response) {
                alert(response.data.message);
            });
        }
    };
});

OMS.controller('manageMemberController', function($scope, $http, $cookies) {

    $scope.getMemberList = function() {
        $http({
            method: 'GET',
            url: '/api/group/members/' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            $scope.member_list = response.data.data;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.getMemberList();

    $scope.addMember = function() {
        $http({
            method: 'POST',
            url: '/api/group/join',
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                group_id: $cookies.get('selected_group'),
                email: $scope.email
            }
        }).then(function successCallback(response) {
            $scope.getMemberList();
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };
});

OMS.controller('manageMenuController', function($scope, $http, $cookies) {

    $scope.getMenuList = function() {
        $http({
            method: 'GET',
            url: '/api/menu/list?group_id=' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            $scope.menu_list = response.data.data;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.getMenuList();

    $scope.addMenu = function() {
        $http({
            method: 'POST',
            url: '/api/menu/create',
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                name: $scope.new_menu_name,
                price: $scope.new_menu_price,
                group_id: $cookies.get('selected_group')
            }
        }).then(function successCallback(response) {
            $scope.getMenuList();
            $scope.new_menu_name = null;
            $scope.new_menu_price = null;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.updateMenu = function(menu_obj, is_active) {
        $http({
            method: 'POST',
            url: '/api/menu/update/' + menu_obj.id,
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                price: menu_obj.price,
                is_available: is_active
            }
        }).then(function successCallback(response) {
            $scope.getMenuList();
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };
});

OMS.controller('manageSetMenuController', function($scope, $http, $cookies) {

    $scope.getMenuList = function() {
        $http({
            method: 'GET',
            url: '/api/menu/list?group_id=' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            $scope.menu_list = response.data.data;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.getSetMenuList = function() {
        $http({
            method: 'GET',
            url: '/api/setmenu/list?group_id=' + $cookies.get('selected_group'),
            headers: {
                Authorization: $cookies.get('access_token')
            }
        }).then(function successCallback(response) {
            $scope.setmenu_list = response.data.data;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.getMenuList();
    $scope.getSetMenuList();

    $scope.updateSetMenu = function(setmenu_obj, is_active) {
        $http({
            method: 'POST',
            url: '/api/setmenu/update/' + setmenu_obj.id,
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                price: setmenu_obj.price,
                is_available: is_active
            }
        }).then(function successCallback(response) {
            $scope.getSetMenuList();
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.newSetContent = [];
    $scope.addMenuIntoNewSet = function(menu_obj) {
        $scope.newSetContent.push(menu_obj);
    };
    $scope.clearSetContent = function() {
        while($scope.newSetContent.length > 0) {
            $scope.newSetContent.pop();
        }
    };

    $scope.addSetMenu = function() {
        var menu_list = [];
        for(var i in $scope.newSetContent) {
            menu_list.push($scope.newSetContent[i].id);
        }

        $http({
            method: 'POST',
            url: '/api/setmenu/create',
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                name: $scope.new_setmenu_name,
                price: $scope.new_setmenu_price,
                group_id: $cookies.get('selected_group'),
                menu_list: menu_list
            }
        }).then(function successCallback(response) {
            $scope.getSetMenuList();
            $scope.new_setmenu_name = null;
            $scope.new_setmenu_price = null;
            $scope.clearSetContent();
        }, function new_setmenu_price(response) {
            alert(response.data.message);
        });
    };

    $scope.showSetContent = function(setlist_content) {
        var set_id_list = JSON.parse(setlist_content);
        var alert_message = "[세트메뉴 구성 품목]\n";

        for(var i in $scope.menu_list) {
            for(var j in set_id_list) {
                if($scope.menu_list[i].id == set_id_list[j]) {
                    alert_message += $scope.menu_list[i].name + " ";
                }
            }
        }
        alert_message += "\n";
        alert(alert_message);
    };
});