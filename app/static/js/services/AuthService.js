Topogram.service('AuthService', AuthService = function($q, localStorageService, Session) {
 
    this.login = function(credentials) {
        var me = this;
        deferred = $q.defer()
        Session.create(credentials, true).then(function(user) {
            me.setToken(credentials);
            return deferred.resolve(user);
        }, function(response) {
            switch (response.status) {
                case 401:
                    return deferred.reject(false);
                case 422:
                    return deferred.reject({status: 422, statusText:"Wrong password or email"});
                default:
                    // throw new Error('No handler for status code ' + response.status);
                    return deferred.reject(response)
            }
            return deferred.reject(response)
        });
        return deferred.promise
    };
 
    this.logout = function() {
        Session.destroy();
        localStorageService.clearAll();
    };
 
    this.isAuthenticated = function() {
        var token = this.getToken();

        if (token) {
            return true
        }
        return false;
    };
 
    this.setToken = function(credentials) {
        localStorageService.set('token', btoa(credentials.email + ':' + credentials.password));
    };
 
    this.getToken = function() {
        // console.log(localStorageService.get('token'));
        return localStorageService.get('token');
    };
 
    return this;
})
