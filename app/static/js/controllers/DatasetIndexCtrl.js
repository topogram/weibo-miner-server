function DatasetIndexCtrl($scope, $http, $location, $timeout, Restangular, flash) {
    console.log('DatasetViewCtrl');
    $scope.posts = Restangular.all('datasets').getList().$object;
    
     $scope.delete = function(dataset) {
        dataset.remove().then(function() {
            $timeout(function() {
                $location.path("/datasets");
            })
            $scope.posts = _.without($scope.datasets, dataset);
        });
    }
}
