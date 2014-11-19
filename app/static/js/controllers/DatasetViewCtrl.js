function DatasetViewCtrl($scope, $routeParams, $location, Restangular, flash) {

    Restangular.one('datasets',$routeParams.datasetId).get().then(function(dataset) {
            // console.log(memes);
            $scope.dataset = dataset;
    });

    Restangular.one('datasets',$routeParams.datasetId).getList('memes').then(function(memes) {
            // console.log(memes);
            $scope.memes = memes;
    });

    // $scope.delete = function(meme) {
    //     // console.log($scope.memes);
    //     meme.remove().then(function() {
    //         $timeout(function() {
    //             $location.path("/memes");
    //         })
    //         $scope.posts = _.without($scope.memes, meme);
    //     });
    // }
}
