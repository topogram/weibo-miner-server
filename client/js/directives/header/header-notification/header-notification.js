'use strict';

/**
 * @ngdoc directive
 * @name izzyposWebApp.directive:adminPosHeader
 * @description
 * # adminPosHeader
 */
Topogram.directive('headerNotification',function(){
		return {
        templateUrl:'js/directives/header/header-notification/header-notification.html',
        restrict: 'E',
        replace: true,
    	}
	});


