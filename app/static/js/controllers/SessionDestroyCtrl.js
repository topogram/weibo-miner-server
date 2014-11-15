function SessionDestroyCtrl($scope, $timeout, $location, AuthService) {

    $scope.doLogout = function () {
        AuthService.logout();
        $timeout(function() {
            console.log('test');
            $location.path("/");
        });
    }
}
