function DatasetViewCtrl($scope, $routeParams, $timeout, $location, Restangular, flash) {

    Restangular.one('datasets',$routeParams.datasetId).get().then(function(dataset) {
            // console.log(topograms);
            $scope.dataset = dataset;
    });

    Restangular.one('datasets',$routeParams.datasetId).getList('topograms').then(function(topograms) {
            // console.log(topograms);
            $scope.topograms = topograms;
    });

    $scope.delete = function(topogram) {
        
        topogram.remove().then(function() {
            $timeout(function() {
                $location.path("/datasets/"+ $scope.dataset.id);
            })
            $scope.posts = _.without($scope.topograms, topogram);
        });
    }
}
