function ApplicationCtrl($scope, Restangular, AuthService, flash) {
    $scope.isLoggedIn = AuthService.isAuthenticated();
    $scope.isLogged= function() {
        return AuthService.isAuthenticated();
    }
}
