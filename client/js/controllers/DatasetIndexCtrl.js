function DatasetIndexCtrl($scope, $http, $location, $timeout, Restangular, flash, modalService) {

    Restangular.all('datasets').getList().then(function(datasets){
        $scope.posts = datasets.map(function(d){
            d.csvfilename = d.filepath.replace(/^.*[\\\/]/, ''); // extract just file name
            return d;
        });
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

                // remove from scope
                var index = $scope.posts.indexOf(dataset);
                if (index > -1) $scope.posts.splice(index, 1);

                // notify user
                $timeout(function() { flash.success = "Dataset deleted" })
            });
        }, function () {
            // TODO : hit cancel
            console.info('Modal dismissed at: ' + new Date());
        });

    }
}
