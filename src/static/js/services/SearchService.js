/**
 * Create a service to power calls to Elasticsearch. We only need to
 * use the search endpoint.
 */
Topogram.factory('searchService',
    ['$q', 'esFactory', '$location', function($q, elasticsearch, $location){
        var client = elasticsearch({
            host: $location.host() + ":9200"
        });

        /*
        * Given an index,a term, give count and results.
        *
        * Returns a promise.
        */
        var search = function(index,term) {
          console.log(index, term);

          var deferred = $q.defer();
          client.search({
            // explain: true,
            version:true,
            // stats :
            q: term,
            size:10,
            index:index,
            type : 'message'
            ,
            body: {
                "facets" : {
                    "histogram" : {
                        "date_histogram" : {
                            "field" : "created_at",
                            "interval" : "hour"
                        }
                    }
                }
            }
          }
          ).then(function (result) {
            console.log(result);
              var ii = 0, hits_in, hits_out = [];
                hits_in = (result.hits || {}).hits || [];
                for(;ii < hits_in.length; ii++){
                    hits_out.push(hits_in[ii]._source);
                }
                deferred.resolve({
                  "messages":hits_out,
                  "total":result.hits.total ,
                  "histogram":result.facets.histogram.entries
                });
          }, deferred.reject);
          return deferred.promise;
        }

        /**
         * Given an index, a term and an offset, load another round of 10 results.
         *
         * Returns a promise.
         */
        var loadMore = function(index, term, offset){
            var deferred = $q.defer();
            var query = {
                "match": {
                    "_all": term
                }
            };

            client.search({
                "index": index,
                "type": 'message',
                q: term,
                "body": {
                    "size": 10,
                    "from": (offset || 0) * 10
                }
            }).then(function(result) {
                console.log(result);
                var ii = 0, hits_in, hits_out = [];
                hits_in = (result.hits || {}).hits || [];
                for(;ii < hits_in.length; ii++){
                    hits_out.push(hits_in[ii]._source);
                }

                deferred.resolve({
                  "messages":hits_out,
                  "total":result.hits.total
                });

            }, deferred.reject);
            return deferred.promise;
        };

        /**
         * Given nothing.
         *
         * Returns a list of indices.
         */
        var indexes = function(callback){
          var deferred = $q.defer();

          client.indices.getAliases(function(err,resp) {
            if (err) {
                console.log(err);
                return err;
            } else {
              var indices=[];
              for(var index in resp){
                   indices.push(index);
              }
              callback(indices);
            }
          });
        }

        return {
            "search": search,
            "loadMore": loadMore,
            "indexes" :indexes
        };
    }]
);
