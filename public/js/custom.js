var OMS = angular.module('OMS', ['ui.router', 'ngRoute']);

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
            templateUrl: 'template/group/create.html'
        })
        .state('group.current', {
            url: '/current',
            templateUrl: 'template/group/current.html'
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
        });

    //$locationProvider.html5mode(true);
    
});