function DatasetIndexCtrl($scope, Restangular, flash) {
    console.log('DatasetViewCtrl');
    $scope.posts = Restangular.all('datasets').getList().$object;
}
