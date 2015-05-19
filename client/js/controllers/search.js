/*
        <form class="form-inline" ng-submit="search()" role="form">
            <input ng-model="searchTerm" type="search" name="title" class="form-control" ng-required='true'/>
            <button type="submit" class="btn btn-default">Get results</button>
            <p class="help-block">Use operators AND, OR and quotes for more precise queries <a href="http://lucene.apache.org/core/2_9_4/queryparsersyntax.html" target="_blank">[help]</a></p>
        </form>

*/

    // Search term from URL query term, plus a default one
    $scope.searchTerm = $location.search().q;
    $scope.index= $location.search().index;


 /*
    SEARCH
    */

    $scope.search = function(){
      $scope.page = 0;
      $scope.messages = [];
      $scope.allResults = false;
      $scope.searchFirst();
    };

    /**
    * A fresh search. Reset the scope variables to their defaults, set
    * the q query parameter.
    */

    $scope.searchFirst= function(){ 
        $scope.readyToSave = false;
        searchService.search($scope.index,$scope.searchTerm).then(function(results){

            // TITLE
            $scope.title=$scope.searchTerm;
            $scope.totalResults=results.total;

            if(results.messages.length !== 10){
              $scope.allResults = true;
            }

            var ii = 0;
            for(;ii < results.messages.length; ii++){
              $scope.messages.push(results.messages[ii]);
            }

            // HISTOGRAM
            if(results.histogram.length){
                $scope.start=results.histogram[0].time;
                $scope.end=results.histogram[results.histogram.length-1].time;
                $scope.timeData=results.histogram;
            }
        });
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
