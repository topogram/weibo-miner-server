function DatasetCreateCtrl($scope, $timeout, $location, Restangular,FileUploader, modalService, flash) {

    $scope.dataset = {};
    $scope.dataset.title = "";

    $scope.$watch("dataset.title", function(n,o){
        console.log(n);
    })

    // FILE UPLOAD
    var uploader = $scope.uploader = new FileUploader({
        url: '/api/v1/datasets',
        alias : "dataset",
        formData : [ $scope.dataset ]
    });

    // FILTERS
    uploader.filters.push({
        name: 'csvFilter',
        fn: function(item /*{File|FileLikeObject}*/, options) {
            var filetype = item.name.split('.').pop();
            var authorized  = ["csv", "txt"];
            return authorized.indexOf(filetype) !== -1;
        }
    });

    uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/, filter, options) {
                console.info('onWhenAddingFileFailed', item, filter, options);
                flash.error = "Error when adding file ";
            };

    uploader.onAfterAddingFile = function(fileItem) {
        console.info('onAfterAddingFile', fileItem);
        console.log($scope.dataset);
    };

    uploader.onBeforeUploadItem = function(item) {
            uploader.formData = $scope.dataset;
    }

    uploader.onSuccessItem = function(fileItem, response, status, headers) {

        console.log(response);
        flash.success = "Dataset created ! " + response.id;

        $timeout(function() {
            $location.path("/datasets/"+response.id);
        })
    };

    uploader.onErrorItem = function(fileItem, response, status, headers) {
        flash.error = response
    };

}
