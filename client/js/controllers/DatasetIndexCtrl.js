function DatasetIndexCtrl($scope, $http, $location, $timeout, Restangular, flash, modalService) {

    Restangular.all('datasets').getList().then(function(datasets){
        $scope.posts = datasets;
    }, function(err) {
        console.log(err);
        flash.error = err.status + " : "+ err.statusText;
    });
    
    $scope.delete = function(dataset) {
        var modalOptions = {
            closeButtonText: 'Cancel',
            actionButtonText: 'Delete',
            headerText: 'Delete',
            bodyText: 'Are you sure you want to delete this data set?',
            waitModal : false
        };

        modalService.showModal({}, modalOptions).then(function (deleted) {
            console.log("modal");
            console.log(deleted);
            dataset.remove().then(function() {
                $timeout(function() {
                                    // $location.path("/datasets");
                                    flash.success = "Dataset deleted"
                                })
                $scope.posts = _.without($scope.datasets, dataset);
            });
        }, function () {
            // TODO : hit cancel
            console.info('Modal dismissed at: ' + new Date());
        });

    }
}
