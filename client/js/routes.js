// routes
Topogram.config(function($routeProvider, RestangularProvider) {


    RestangularProvider.setBaseUrl('/api/v1');

    var partialsDir = '../partials';

    var redirectIfAuthenticated = function(route) {
        return function($location, $q, AuthService) {

            var deferred = $q.defer();

            if (AuthService.isAuthenticated()) {
                deferred.reject()
                $location.path(route);
            } else {
                deferred.resolve()
            }

            return deferred.promise;
        }
    }

    var redirectIfNotAuthenticated = function(route) {
        return function($location, $q, AuthService) {

            var deferred = $q.defer();

            if (! AuthService.isAuthenticated()) {
                deferred.reject()
                $location.path(route);
            } else {
                deferred.resolve()
            }

            return deferred.promise;
        }
    }

    $routeProvider
        .when('/', {
            controller: 'HomeDetailCtrl',
            templateUrl: partialsDir + '/home/index.html'
        })
        .when('/sessions/create', {
            controller: 'SessionCreateCtrl',
            templateUrl: partialsDir + '/session/create.html',
            resolve: {
                redirectIfAuthenticated: redirectIfAuthenticated('/posts/create')
            }
        })
        .when('/sessions/destroy', {
            controller: 'SessionDestroyCtrl',
            templateUrl: partialsDir + '/session/destroy.html'
        })
        .when('/users/create', {
            controller: 'UserCreateCtrl',
            templateUrl: partialsDir + '/user/create.html'
        })
        .when('/users/new-password', {
            controller: 'NewPasswordCtrl',
            templateUrl: partialsDir + '/user/password.html'
        })
        .when('/users/reset-password', {
            controller: 'ResetPasswordCtrl',
            templateUrl: partialsDir + '/user/reset.html'
        })
        .when('/datasets/create', {
            controller: 'DatasetCreateCtrl',
            templateUrl: partialsDir + '/datasets/create.html',
            resolve: {
                redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
            }
        })
        .when('/datasets', {
            controller: 'DatasetIndexCtrl',
            templateUrl: partialsDir + '/datasets/index.html',
            resolve: {
                redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
            }
        })
        .when('/datasets/:datasetId', {
            controller: 'DatasetViewCtrl',
            templateUrl: partialsDir + '/datasets/view.html',
            resolve: {
                redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
            }
        })
        .when('/datasets/:datasetId/topograms/create', {
            controller: 'TopogramCreateCtrl',
            templateUrl: partialsDir + '/topograms/create.html',
            resolve: {
                redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
            }
        })
        // .when('/topograms', {
        //     controller: 'TopogramIndexCtrl',
        //     templateUrl: partialsDir + '/topograms/index.html',
        //     resolve: {
        //         redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
        //     }
        // })
        .when('/datasets/:datasetId/topograms/:topogramId', {
            controller: 'TopogramViewCtrl',
            templateUrl: partialsDir + '/topograms/view.html',
            resolve: {
                redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
            }
        })
        ;
})
