Topogram.factory('Dataset', function(Restangular) {
    var Dataset;
    Dataset = {
        get: function() {
            return Restangular
                .one('datasets')
                .getList();
        },
        getAll: function() {
             return Restangular
             .all('datasets')
             .getList();
        },
        create: function(data) {
            return Restangular
                .one('datasets')
                .customPOST(data);
        }
    };
    return Dataset;
})
