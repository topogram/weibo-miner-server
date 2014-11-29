// curl --dump-header - -H "Content-Type: application/json" -X POST -d '{"email": "johndoe@gmail.com","password": "admin"}' http://localhost:5000/api/v1/sessions

function SessionCreateCtrl($scope, $location, $timeout, AuthService, flash) {

    $scope.loginInfo = {};

    $scope.submitLoginForm = function () {
        // console.log($scope.loginInfo);
        // console.log(AuthService.login($scope.loginInfo));
        AuthService.login($scope.loginInfo).then(function(logInfo) {
            console.log(logInfo);
            $timeout(function() {
                $location.path("/");
                $scope.isLoggedIn = true;
                $scope.$apply();
            })

        }, function(err) {
            console.log(err);
            flash.error = "Login failed : ("+ err.status+") "+ err.statusText;
        });
    }
}
