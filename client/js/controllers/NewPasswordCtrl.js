function NewPasswordCtrl($scope, $routeParams, $location, flash, Restangular) {

    $scope.newPasswordInfo = {};
    $scope.submitNewPasswordForm = function () {

        console.log($scope.newPasswordInfo);

        if( !$scope.newPasswordInfo.email ) {
          flash.error = "Please complete the form.";
        } else {
          // send the data to the server
          Restangular.all('users').all("newPassword").post( $scope.newPasswordInfo).then(function(resp) {
            console.log(resp);
            // redirect
            flash.success = "Instructions to reset your email have been sent to  your mailbox.";

          }, function(response) {
              console.log(response);
              flash.error =  response.data;
          });
        }
    }
}
