Topogram.factory('Session', function(Restangular) {
    var Session;
    Session = {
        create: function(data, bypassErrorInterceptor) {
            return Restangular
                .one('sessions')
                .withHttpConfig({bypassErrorInterceptor: bypassErrorInterceptor})
                .customPOST(data);
        },
        destroy : function(data) {
            // console.log('closing session');
            return Restangular
                .one('sessions')
                .remove()
        }
    };
    return Session;
})
