function MemeViewCtrl($scope, $routeParams, $timeout, $location, Restangular) {

    Restangular.one('datasets',$routeParams.datasetId).one("memes", $routeParams.memeId).get().then(function(meme) {
            console.log(meme);
            $scope.meme = meme;
    });

}
