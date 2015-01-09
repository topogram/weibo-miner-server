function SessionDestroyCtrl($scope, $timeout, $location, flash, AuthService) {

    $scope.doLogout = function () {
        AuthService.logout();
        $timeout(function() {
            console.log('test');
            $location.path("/");
            flash.success = "You have been logged out successfully."
        });
    }
}
