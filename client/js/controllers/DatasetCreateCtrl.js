function DatasetCreateCtrl($scope, $timeout, $location, Restangular,FileUploader, modalService, flash) {

    // Restangular.all('topotypes').getList().then(function(topotypes){
    //     $scope.topotypes=topotypes;
    //     console.log(topotypes);
    // })

    $scope.dataset = {};
    
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
            var type = '|' + item.type.slice(item.type.lastIndexOf('/') + 1) + '|';
            return '|csv|'.indexOf(type) !== -1;
        }
    });

    $scope.modalShow = function() {
        // $scope.modalWait = modalService.showModal({}, { bodyText : "We are currently indexing your file. This may take some time, please be patient", waitModal : true }).then(function (ok) {
        //                 // promise fullfiled 
        //                  // console.log(ok);
        //             }, function () {
        //                 // TODO : hit cancel
        //                 console.info('Modal dismissed at: ' + new Date());
        //             });
      };

    $scope.modalClose = function() {
    modalService.closeAll();
    }

    uploader.onBeforeUploadItem = function(item) {
            $scope.modalShow();
    };

        // function closeModal() { modalService.close(); }

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
