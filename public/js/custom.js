'use strict';

var OMS = angular.module('OMS', ['ui.router', 'ngRoute', 'ngCookies']);

OMS.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
    $urlRouterProvider.otherwise("/");

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
            templateUrl: 'template/order/request.html'
        })
        .state('order.confirm', {
            url: '/confirm',
            templateUrl: 'template/order/confirm.html'
        })
        .state('statistics', {
            abstract: true,
            url: '/statistics',
            templateUrl: 'template/statistics/base.html'
        })
        .state('statistics.status', {
            url: '/status',
            templateUrl: 'template/statistics/status.html'
        })
        .state('statistics.queue', {
            url: '/queue',
            templateUrl: 'template/statistics/queue.html'
        })
        .state('manage', {
            abstract: true,
            url: '/manage',
            templateUrl: 'template/manage/base.html'
        })
        .state('manage.member', {
            url: '/member',
            templateUrl: 'template/manage/member.html'
        })
        .state('manage.menu', {
            url: '/menu',
            templateUrl: 'template/manage/menu.html'
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

    //$locationProvider.html5mode(true);
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
    };

    $rootScope.get_group_list();
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