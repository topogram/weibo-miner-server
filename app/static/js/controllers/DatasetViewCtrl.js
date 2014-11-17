function DatasetViewCtrl($scope, $routeParams, Restangular, flash) {

    Restangular.one('datasets',$routeParams.datasetId).get().then(function(dataset) {
        console.log(dataset);
        $scope.columns = [];
        for (colHeader in dataset.csvSample[0]) {
            console.log(colHeader);
            $scope.columns.push({"title": colHeader, 'field': colHeader})
        };
        $scope.dataset = dataset;

    });
}
