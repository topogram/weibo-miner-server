function MemeCreateCtrl($scope, $routeParams, $location, Restangular, flash, searchService) {

    Restangular.one('datasets',$routeParams.datasetId).get().then(function(dataset) {
        // console.log(dataset);
        $scope.dataset = dataset;
        // $scope.datasetId = dataset.id;

        $scope.index = dataset.index_name;

    });

    // Initialize the scope defaults.
    // $scope.indices=[]       // list of elasticsearch indices
    $scope.columns = [];
    $scope.rows = [];     // An array of messages results to display
    $scope.page = 0;        // A counter to keep track of our current page
    $scope.allResults = false;  // Whether or not all results have been found.
    $scope.totalResults=0 // All messages matching the query

    // Query term, plus a default one
    $scope.searchTerm = $location.search().q;
    $scope.index= $location.search().index;

    // console.log($scope.searchTerm);
    // console.log($scope.index);

    $scope.search = function(){
        $scope.page = 0;
        $scope.messages = [];
        $scope.allResults = false;
        $location.search({'q': $scope.searchTerm,
                          "index":$scope.index}
                          );
        $scope.searchFirst();
    };

    /**
     * Load the next page of results, incrementing the page counter.
     * When query is finished, push results onto $scope.recipes and decide
     * whether all results have been returned (i.e. were 10 results returned?)
    */

    $scope.loadMore = function(){
      searchService
        .loadMore($scope.index, $scope.searchTerm, $scope.page++).then(function(results){
          if(results.messages.length !== 10){
              $scope.allResults = true;
          }

          var ii = 0;
          for(;ii < results.messages.length; ii++){
              $scope.messages.push(results.messages[ii]);
          }
        })
    };

    /**
     * A fresh search. Reset the scope variables to their defaults, set
     * the q query parameter.
     */
    $scope.searchFirst= function(){
      searchService.search($scope.index,$scope.searchTerm).then(function(results){
            // console.log("search success");
            console.log(results);

            for (colName in results.messages[0]) {
                // console.log(colHeader);
                $scope.columns.push({"title": colName, 'field': colName})
            };

            $scope.totalResults=results.total;
            
            if(results.messages.length !== 10){
                $scope.allResults = true;
            }
            console.log($scope.allResults);

            var ii = 0;
            for(;ii < results.messages.length; ii++){
                $scope.messages.push(results.messages[ii]);
            }

        
            $scope.title=$scope.searchTerm;
            
            if(results.histogram.length){
              $scope.start=results.histogram[0].time;
              $scope.end=results.histogram[results.histogram.length-1].time;
              $scope.timeData=results.histogram;
            }

      });

    };

    $scope.createMeme = function () {
        console.log($scope);

        var meme = {
          "es_query" : $scope.searchTerm,
          "es_index_name" : $scope.index,
          "description" : $scope.description,
          "dataset_id" : $routeParams.datasetId,
          "topotype_id" : $scope.dataset.topotype_id
        };

        Restangular.all('memes').post(meme).then(function(meme) {
            flash.success = "New meme created !"
            $location.path("/datasets/"+$routeParams.datasetId+"/memes/"+meme.id);
        });
    }


}
