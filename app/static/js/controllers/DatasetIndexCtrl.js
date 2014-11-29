function DatasetIndexCtrl($scope, $http, $location, $timeout, Restangular, flash) {
    console.log('DatasetViewCtrl');
    // $scope.posts = Restangular.all('datasets').getList().$object;
    Restangular.all('datasets').getList().then(function(datasets){
        $scope.posts = datasets;
    }, function(err) {
        console.log(err);
        flash.error = err.status + " : "+ err.statusText;
    });
    
     $scope.delete = function(dataset) {
        dataset.remove().then(function() {
            $timeout(function() {
                $location.path("/datasets");
            })
            $scope.posts = _.without($scope.datasets, dataset);
        });
    }
}
