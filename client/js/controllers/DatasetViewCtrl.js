function DatasetViewCtrl($scope, $routeParams, $timeout, $location, Restangular, flash) {

    Restangular.one('datasets',$routeParams.datasetId).get().then(function(dataset) {
            console.log(dataset);
            $scope.dataset = dataset;

            Restangular.one('datasets',$routeParams.datasetId).getList("sample").then(function(sample) {
                $scope.dataset.sample = sample;
                if (sample.length !=0) {
                    $scope.dataset.columns = Object.keys(sample[0].plain());
                }
            });
    });

    Restangular.one('datasets',$routeParams.datasetId).getList('topograms').then(function(topograms) {
            // console.log(topograms);
            $scope.topograms = topograms;
    });

    $scope.topogram = [];
    
    $scope.delete = function(topogram) {
        
        topogram.remove().then(function() {
            $timeout(function() {
                $location.path("/datasets/"+ $scope.dataset.id);
            })
            $scope.posts = _.without($scope.topograms, topogram);
        });
    }
}
