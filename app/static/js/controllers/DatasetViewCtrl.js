function DatasetViewCtrl($scope, $routeParams, Restangular, flash) {
    $scope.dataset = Restangular.one('datasets',$routeParams.datasetId).get().$object;
    console.log($scope.dataset);
}
