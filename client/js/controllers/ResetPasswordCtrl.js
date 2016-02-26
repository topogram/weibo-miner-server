// curl --dump-header - -H "Content-Type: application/json" -X POST -d '{"email": "johndoe@gmail.com","password": "admin"}' http://localhost:5000/api/v1/users

function ResetPasswordCtrl($scope, $routeParams, $location, flash, Restangular) {

    $scope.resetPasswordInfo = {};

    // parse URLs params  console.log($routeParams);
    if ($routeParams.email) $scope.resetPasswordInfo.email = $routeParams.email;
    if ($routeParams.token) $scope.resetPasswordInfo.token = $routeParams.token;

    console.log($scope.resetPasswordInfo);

    $scope.submitResetPasswordForm = function () {

        console.log($scope.resetPasswordInfo, resetPasswordFrom);

        if( !$scope.resetPasswordInfo.token || !$scope.resetPasswordInfo.email || !$scope.resetPasswordInfo.confirm || !$scope.resetPasswordInfo.password || $scope.resetPasswordInfo.confirm != $scope.resetPasswordInfo.password) {
          flash.error = "Please complete the form.";
        } else {
          // send the data to the server
          Restangular.all('users').all("resetPassword").post( $scope.resetPasswordInfo).then(function(resp) {

            // redirect
            flash.success = "Your password have been succesfully updated.";
            $location.search('email', null)
            $location.search('token', null)
            $location.path("/sessions/create");
          }, function(response) {
              console.log(response);
              flash.error =  response.data;
          });
        }
    }
}
