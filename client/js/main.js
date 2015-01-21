window.Topogram = angular.module('Blog', [
                                 'ngRoute', 
                                 'restangular', 
                                 'LocalStorageModule',
                                 'angular-flash.service',
                                 'angular-flash.flash-alert-directive',
                                 'angularFileUpload',
                                 'elasticsearch',
                                 "ui.bootstrap",
                                 "ui.bootstrap-slider",
                                 "ngTable"
                                 ])
.run(function($location, Restangular, AuthService) {
    Restangular.setFullRequestInterceptor(function(element, operation, route, url, headers, params, httpConfig) {
        headers['Authorization'] = 'Basic ' + AuthService.getToken();
        return {
            headers: headers
        };
    });
 
    Restangular.setErrorInterceptor(function(response, deferred, responseHandler) {
        if (response.config.bypassErrorInterceptor) {
            return true;
        } else {
            switch (response.status) {
                case 401:
                    AuthService.logout();
                    $location.path('/sessions/create');
                    break;
                default:
                    // throw new Error('No handler for status code ' + response.status);
                    // console.log(response);
                    return response

            }
            return false;
        }
    });
})

// fix for bootstrap 3
Topogram.config(['flashProvider', function(flashProvider) {
  flashProvider.errorClassnames.push('alert-danger');
}])

Topogram.filter('unsafe', function($sce) { return $sce.trustAsHtml; });
