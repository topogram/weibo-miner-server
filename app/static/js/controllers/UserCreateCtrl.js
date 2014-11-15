// curl --dump-header - -H "Content-Type: application/json" -X POST -d '{"email": "johndoe@gmail.com","password": "admin"}' http://localhost:5000/api/v1/users

function UserCreateCtrl($scope, $location, Restangular) {

    $scope.loginInfo = {};

    $scope.submitRegisterForm = function () {
        console.log($scope.loginInfo);
        Restangular.all('users').post($scope.loginInfo).then(function(resp) {
            console.log(resp);
            $location.path("/");
        });
    }
}
