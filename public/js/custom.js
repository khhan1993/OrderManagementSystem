"use strict";

var OMS = angular.module('OMS', ['ui.router', 'ngRoute', 'ngCookies']);

OMS.config(function($stateProvider, $urlRouterProvider, $locationProvider) {

    $urlRouterProvider.otherwise("/");
    $locationProvider.html5Mode(true);

    $stateProvider
        .state('home', {
            url: '/',
            templateUrl: 'template/home.html'
        })
        .state('auth', {
            abstract: true,
            url: '/auth',
            templateUrl: 'template/auth/base.html'
        })
        .state('auth.signup', {
            url: '/signup',
            templateUrl: 'template/auth/signup.html',
            controller: 'signupController'
        })
        .state('auth.signin', {
            url: '/signin',
            templateUrl: 'template/auth/signin.html',
            controller: 'signinController'
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
        .state('group.info', {
            url: '/info',
            templateUrl: 'template/group/info.html',
            controller: 'getCurrentGroupInfoController'
        })
        .state('group.list', {
            url: '/list',
            templateUrl: 'template/group/list.html',
            controller: 'getEnrolledGroupListController'
        })
        .state('order', {
            abstract: true,
            url: '/order',
            templateUrl: 'template/order/base.html'
        })
        .state('order.request', {
            url: '/create',
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
            templateUrl: 'template/statistics/base.html'
        })
        .state('statistics.waiting', {
            url: '/waiting',
            templateUrl: 'template/statistics/waiting.html',
            controller: 'statisticsWaitingController'
        })
        .state('manage', {
            abstract: true,
            url: '/manage',
            templateUrl: 'template/manage/base.html'
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

            if(!$state.is('home') && !$state.is('auth.signin') && !$state.is('auth.signup')) {
                $state.go('home');
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
        var target_date = new Date(dateObj);

        var year = target_date.getFullYear();
        var month = target_date.getMonth() + 1;
        var date = target_date.getDate();
        var hour = target_date.getHours();
        var minute = target_date.getMinutes();

        return year + "년 " + month + "월 " + date + "일 " + hour + "시 " + minute + "분";
    };
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

OMS.controller('createGroupController', function($scope, $http, $cookies, $state) {

    $scope.group_name = null;

    $scope.create_group = function() {
        $http({
            method: 'POST',
            url: '/api/group/create',
            headers: {
                Authorization: $cookies.get('access_token')
            },
            data: {
                name: $scope.group_name
            }
        }).then(function successCallback(response) {
            alert('그룹이 생성되었습니다!');
            $state.go('group.list');
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

OMS.controller('getEnrolledGroupListController', function($scope, $http, $cookies) {

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
    
    $scope.selected_group = $cookies.get('selected_group');

    $scope.select_group = function(group_id) {
        var validDate = new Date();
        validDate.setHours(validDate.getHours() + 12);
        $cookies.put('selected_group', group_id, {
            expires: validDate
        });

        $scope.selected_group = $cookies.get('selected_group');
    };
});

OMS.controller('orderRequestController', function($scope, $http, $cookies) {

    $scope.getMenuList = function() {
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
    };

    $scope.getSetMenuList = function() {
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

    $scope.getNewList = function() {
        $scope.getMenuList();
        $scope.getSetMenuList();
    };

    $scope.getNewList();

    $scope.total_price = 0;
    $scope.table_num = null;

    $scope.updateMenuCount = function(menu_obj, count) {
        if(count < 0){
            count = 0;
        }

        $scope.total_price -= parseInt(menu_obj.price * menu_obj.count);
        menu_obj.count = count;
        $scope.total_price += parseInt(menu_obj.price * menu_obj.count);
    };

    $scope.updateTotalPriceDirectly = function() {
        $scope.total_price = 0;
        for(var i in $scope.menu_list) {
            $scope.total_price += ($scope.menu_list[i].price * $scope.menu_list[i].count);
        }
        
        for(var j in $scope.setmenu_list) {
            $scope.total_price += ($scope.setmenu_list[j].price * $scope.setmenu_list[j].count);
        }
    };

    $scope.updateSetMenuCount = function(setmenu_obj, count) {
        if(count < 0){
            count = 0;
        }

        $scope.total_price -= parseInt(setmenu_obj.price * setmenu_obj.count);
        setmenu_obj.count = count;
        $scope.total_price += parseInt(setmenu_obj.price * setmenu_obj.count);
    };

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
            alert("주문 요청이 완료되었습니다.\n주문번호는 " + response.data.data.id + "번 입니다.");
            $scope.getNewList();
            $scope.total_price = 0;
            $scope.table_num = null;
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };
});

OMS.controller('orderConfirmController', function($rootScope, $scope, $http, $cookies) {

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

    $scope.show_order_content = function(data) {
        var content_text = "주문번호: " + data.id + "\n";
        content_text += "주문자명: " + data.user_name + "\n";
        content_text += "주문 총액: " + data.total_price + "\n";
        content_text += "테이블 번호: " + data.table_num + "\n";
        content_text += "주문 시간: " + $rootScope.getDateTimeText(data.createdAt) + "\n";
        content_text += "\n[일반 주문 내역]\n";
        for(var i in data.content) {
            content_text += data.content[i].name + " " + data.content[i].count + "개\n";
        }
        content_text += "\n[세트 주문 내역]\n";
        for(var i in data.set_content) {
            content_text += data.set_content[i].name + " " + data.set_content[i].count + "개\n";
        }
        alert(content_text);
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

OMS.controller('orderListController', function($rootScope, $scope, $http, $cookies) {

    $scope.current_page_num = 1;

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

    $scope.show_order_content = function(data) {
        var content_text = "주문번호: " + data.id + "\n";
        content_text += "주문자명: " + data.user_name + "\n";
        content_text += "주문 총액: " + data.total_price + "\n";
        content_text += "테이블 번호: " + data.table_num + "\n";
        content_text += "주문 시간: " + $rootScope.getDateTimeText(data.createdAt) + "\n";
        content_text += "\n[일반 주문 내역]\n";
        for(var i in data.content) {
            content_text += data.content[i].name + " " + data.content[i].count + "개\n";
        }
        content_text += "\n[세트 주문 내역]\n";
        for(var i in data.set_content) {
            content_text += data.set_content[i].name + " " + data.set_content[i].count + "개\n";
        }
        alert(content_text);
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

OMS.controller('statisticsWaitingController', function($rootScope, $scope, $http, $cookies) {

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
                            $scope.menu_list[i].waiting_list.push({
                                id: response.data.data.waitings[j].id,
                                content: "T" + response.data.data.waitings[j].table_num + " / " + response.data.data.waitings[j].amount + "개"
                            });
                        }
                    }
                }
            }
            
        }, function errorCallback(response) {
            alert(response.data.message);
        });
    };

    $scope.getWaitingList();

    $scope.update_waiting_status = function(menu_data, waiting_data) {
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

    $scope.remove_exist_member = function(user_id) {
        alert('아직 구현되지 않았습니다!');
    }
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