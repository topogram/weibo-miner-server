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
        .when('/datasets/:datasetId/memes/create', {
            controller: 'MemeCreateCtrl',
            templateUrl: partialsDir + '/memes/create.html',
            resolve: {
                redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
            }
        })
        .when('/memes', {
            controller: 'MemeIndexCtrl',
            templateUrl: partialsDir + '/memes/index.html',
            resolve: {
                redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
            }
        })
        .when('/memes/:memeId', {
            controller: 'MemeViewCtrl',
            templateUrl: partialsDir + '/memes/view.html',
            resolve: {
                redirectIfNotAuthenticated: redirectIfNotAuthenticated('/sessions/create')
            }
        })
        ;
})

    
