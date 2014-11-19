function MemeIndexCtrl($scope, $routeParams, $timeout, $location, Restangular) {

    $scope.memes = Restangular.all('memes').getList().$object;

    
    $scope.delete = function(meme) {
        console.log($scope.memes);
        meme.remove().then(function() {
            $timeout(function() {
                $location.path("/memes");
            })
            $scope.posts = _.without($scope.memes, meme);
        });
    }
}
