function DatasetIndexCtrl($scope, $http, $location, $timeout, Restangular, flash, modalService, socket) {

    Restangular.all('datasets').getList().then(function(datasets){
        $scope.posts = datasets.map(function(d){
            d.csvfilename = d.filepath.replace(/^.*[\\\/]/, ''); // extract just file name
            return d;
        }).sort(function(a,b){
              return new Date(b.created_at) - new Date(a.created_at); // sort by date
        });
    }, function(err) {
        console.log(err);
        flash.error = err.status + " : "+ err.statusText;
    });
    
    // init socket.io

    socket.on('connect', function () {
          console.log('connect');
    });

    socket.on('progress', function (data) {
        console.log(data);
        // var d=JSON.parse(data)
        // console.log(typeof(data), typeof(d));
        // $scope.loadingNetworks=JSON.parse(data);
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
