function DatasetCreateCtrl($scope, $timeout, $location, Restangular,FileUploader, flash) {

    $scope.dataset = {
        "type": "weibo"
    };
    // FILE UPLOAD
    var uploader = $scope.uploader = new FileUploader({
            url: '//localhost:5000/api/v1/datasets',
            alias : "dataset",
            formData : [ $scope.dataset ]
    });

        // uploader.bind('beforeupload', function (event, item) {
        //     item.formData.push({
        //         "dataset": 
        //     });
        // });

    // FILTERS
        uploader.filters.push({
            name: 'csvFilter',
            fn: function(item /*{File|FileLikeObject}*/, options) {
                var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
                return '|csv|'.indexOf(type) !== -1;
            }
        });

    // CALLBACKS

        // uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/, filter, options) {
        //     console.info('onWhenAddingFileFailed', item, filter, options);
        // };
        // uploader.onAfterAddingFile = function(fileItem) {
        //     console.info('onAfterAddingFile', fileItem);
        // };
        // uploader.onAfterAddingAll = function(addedFileItems) {
        //     console.info('onAfterAddingAll', addedFileItems);
        // };
        uploader.onBeforeUploadItem = function(item) {
            console.log($scope.dataset);
            // item.formData = $scope.dataset
            // $scope.apply;
            console.info('onBeforeUploadItem', item);
        };
        // uploader.onProgressItem = function(fileItem, progress) {
        //     console.info('onProgressItem', fileItem, progress);
        // };
        // uploader.onProgressAll = function(progress) {
        //     console.info('onProgressAll', progress);
        // };
        uploader.onSuccessItem = function(fileItem, response, status, headers) {
            // console.info('onSuccessItem', fileItem, response, status, headers);
            flash.success = response;
            $timeout(function() {
                $location.path("/datasets/"+response.id);
            })
        };
        uploader.onErrorItem = function(fileItem, response, status, headers) {
            // console.info('onErrorItem', fileItem, response, status, headers);
            flash.error = response
        };
        // uploader.onCancelItem = function(fileItem, response, status, headers) {
        //     console.info('onCancelItem', fileItem, response, status, headers);
        // };
        // uploader.onCompleteItem = function(fileItem, response, status, headers) {
        //     console.info('onCompleteItem', fileItem, response, status, headers);;
        // };
        // uploader.onCompleteAll = function() {
        //     console.info('onCompleteAll');
        // };

        // console.info('uploader', uploader);
}
