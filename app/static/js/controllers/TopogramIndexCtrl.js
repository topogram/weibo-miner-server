function TopogramIndexCtrl($scope, $routeParams, $timeout, $location, Restangular) {

    $scope.topograms = Restangular.all('topograms').getList().$object;

    
    $scope.delete = function(topogram) {
        console.log($scope.topograms);
        topogram.remove().then(function() {
            $timeout(function() {
                $location.path("/topograms");
            })
            $scope.posts = _.without($scope.topograms, topogram);
        });
    }
}
