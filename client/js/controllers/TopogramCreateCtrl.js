function TopogramCreateCtrl($scope, $routeParams, $location, Restangular, flash, searchService, $timeout, $interval) {

    // Initialize the scope defaults.
    $scope.topogram = {};
    $scope.topogram.stopwords = [];
    $scope.topogram.excludeWords = [];
    $scope.topogram.includeWords = [];

    // $scope.messages = [];
    // $scope.rows = [];     // An array of messages results to display
    // $scope.page = 0;        // A counter to keep track of our current page
    // $scope.allResults = false;  // Whether or not all results have been found.
    // $scope.totalResults=0 // All messages matching the query

    $scope.columns = [{"title": "Text", 'field': "text_column"}, {"title": "Creation Date", 'field': "time_column"},{"title": "Author", 'field': "source_column"} ]; 

    // max size for networks
    $scope.topogram.citations_limit=5;

    // load dataset info from DB
    Restangular.one('datasets',$routeParams.datasetId).get().then(function(dataset) {
          $scope.dataset = dataset;
          $scope.index = dataset.index_name;

          if(dataset.additional_columns) {
            var addCol = dataset.additional_columns.split(",")
            for (i in addCol) {
              $scope.columns.push({ "title": addCol[i] ,"field": addCol[i]});
            }
          }

    });

    $scope.topogram.frequent_words_limit = 100;
    $scope.getMostFrequentWords = function() {
        Restangular.one('datasets',$routeParams.datasetId).one("frequentWords").one(String($scope.topogram.frequent_words_limit)).get().then(function(frequentWords) {
              // console.log(frequentWords);
              $scope.frequentWords = frequentWords;
        });
    }

    $scope.topogram.words_limit = 50;
    $scope.getWordsGraph = function() {
        console.log($routeParams.datasetId);
        console.log($scope.topogram.words_limit);
        Restangular.one('datasets',$routeParams.datasetId).one("words").one(String($scope.topogram.words_limit)).get().then(function(wordsGraph) {
            console.log(wordsGraph);
            // $scope.words=wordsGraph;
            // $scope.wordsForceStarted = true;
        });
    }

    $scope.getTimeSeries = function() {
        Restangular.one('datasets',$routeParams.datasetId).one("timeSeries").get().then(function(timeSeries) {
            console.log(timeSeries);
            $scope.start=timeSeries[0].time;
            $scope.end=timeSeries[timeSeries.length-1].time;
            $scope.timeData = timeSeries;
        });
    }

    /*
    SIZE LIMITS
    */

    // $scope.$watch("wordsLimit", function(value) {
    //   console.log('new words limit : ' + value);
    // });

    // $scope.$watch("citationsLimit", function(value) {
    //   console.log('new citations limit : ' + value);
    // });


    // stopwords
    $scope.addWord =function() {
          if($scope.addedStopWord){
            // console.log($scope.addedStopWord);
            $scope.topogram.stopwords.push(this.addedStopWord);
            $scope.addedStopWord= '';
          }
    }


    /*
    $scope.saveTopogram = function () {

      $scope.topogram.dataset_id = $routeParams.datasetId;
      $scope.topogram.es_query = $scope.searchTerm;
      $scope.topogram.es_index_name = $scope.index;
      $scope.topogram.stopwords = $scope.topogram.stopwords.toString();

      console.log($scope.topogram);

      Restangular.all('topograms').post($scope.topogram).then(function(topogram) {
            $timeout(function() {
                $location.path("/datasets/"+ $routeParams.datasetId + "/topograms/" + topogram.id);
            })
            flash.success = "New topogram created !"

      }, function (error){
          console.log(error);
          flash.error = error.data;
      });

    };
    */


    /*
    PROGRESS BAR
    */
     // var stopLoader;
     // $scope.readyToSave = false;
     // $scope.loadingNetworks = {};
     // $scope.loadingNetworks.percent= 0;

    // init socket.io
    /*
    socket.on('connect', function () {
          console.log('connect');
    });

    socket.on('progress', function (data) {
        console.log(data);
        // var d=JSON.parse(data)
        // console.log(typeof(data), typeof(d));
        // $scope.loadingNetworks=JSON.parse(data);
    });
  */
     // $scope.$watch("loadingNetworks", function(newVal, oldVal){

     //      console.log("loadingNetworks", newVal);

     //      if(newVal !=oldVal && newVal==1) {
     //          stopLoader=$interval( function  () {
     //            console.log("loadingNetworks started");
     //            socket.emit('progress', {"index_name": $scope.index});
     //          }, 200)

     //      } else if(newVal !=oldVal && newVal==100){
     //          $interval.cancel(stopLoader);
     //          stopLoader = undefined;
     //          console.log("done");

     //      }
     // });


    /* 
    $scope.saveTopogram = function () {
      console.log($scope);

      var topogram = {
        "es_query" : $scope.searchTerm,
        "es_index_name" : $scope.index,
        "description" : $scope.description,
        "dataset_id" : $routeParams.datasetId,
        "topotype_id" : $scope.dataset.topotype_id
        // ,
        // "words"     : JSON.stringify($scope.words),
        // "citations" : JSON.stringify($scope.citations) 
      };
      console.log($scope.words, $scope.citations);

      Restangular.all('topograms').post(topogram).then(function(topogram) {
        flash.success = "New topogram created !"
        $location.path("/datasets/"+$routeParams.datasetId+"/topograms/"+topogram.id);
      });
    }

        $scope.processData = function() {
          var topoInfo = {
            "es_query" : $scope.searchTerm,
            "es_index_name" : $scope.index,
            "dataset_id" : $routeParams.datasetId,
            "topotype_id" : $scope.dataset.topotype_id,
            "citations_limit" : 50,
            "words_limit" : 50
          };

          // process data if any results
          if (results.total !=0) { 
              $scope.loadingNetworks.percent = 1;
              
              Restangular.all('topograms').all('networks').post(topoInfo).then(function(topogram) {

                $scope.loadingNetworks.current = results.total;
                $scope.loadingNetworks.percent = 100;

                $scope.readyToSave = true;

                console.log("all data is ok ! ");
                
                // words
                if (topogram.words.index.length !=0) {
                  $scope.words=topogram.words;
                  if(data.words.index!=undefined) $scope.wordsLength=topogram.words.index.length;
                  $scope.wordForceStarted = true;
                }
                
                // citations
                console.log(topogram);
                if (topogram.citations.index.length !=0) {

                  $scope.showCommunities=false; // show provinces clustering or communities

                  $scope.citations=topogram.citations;
                  if(topogram.citations.index!=undefined) $scope.citationsLength=topogram.citations.index.length;
                  $scope.wordForceStarted = true;
                }
              });
          }
    } */

} // end controller
