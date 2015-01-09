function TopogramCreateCtrl($scope, $routeParams, $location, Restangular, flash, searchService, socket, $timeout, $interval) {

    // Initialize the scope defaults.
    $scope.topogram = {};
    $scope.topogram.stopwords = [];

    $scope.messages = [];
    $scope.rows = [];     // An array of messages results to display
    $scope.page = 0;        // A counter to keep track of our current page
    $scope.allResults = false;  // Whether or not all results have been found.
    $scope.totalResults=0 // All messages matching the query

    $scope.columns = [{"title": "Text", 'field': "text"}, {"title": "Creation Date", 'field': "created_at"},{"title": "Author", 'field': "source"} ]; 


    // Search term from URL query term, plus a default one
    $scope.searchTerm = $location.search().q;
    $scope.index= $location.search().index;

    // max size for networks
    $scope.topogram.citations_limit=5;
    $scope.topogram.words_limit = 10;

    // load dataset info from DB
    Restangular.one('datasets',$routeParams.datasetId).get().then(function(dataset) {
          $scope.dataset = dataset;
          $scope.index = dataset.index_name;
          // for (var i = 0; i < stops.length; i++) {
          //   $scope.stopwords.push(stops[i])
          // }
          // socket.emit('progress', {"index_name": $scope.index});
    });


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


    /* 
    REGEXPS
    */

      // iterator for browsing sample data
      $scope.currentColumn = 1;
      $scope.regTxt = "";
      $scope.regexp ={}
      $scope.regexp.regexp=undefined;
      $scope.regexps = [];

      Restangular.one('regexps').getList().then(function(regexps) {
        $scope.regexps = regexps;
      });


      // regexp
      $scope.nextColumn = function() {
        if($scope.currentColumn != $scope.messages.length)
          $scope.currentColumn++;
        else  $scope.currentColumn = $scope.messages.length;
        $scope.updateRegTxt();
      }

      $scope.prevColumn = function() {
          if($scope.currentColumn != 1) {$scope.currentColumn--;}
          else $scope.currentColumn = 1;
          $scope.updateRegTxt();
      }

      $scope.updateRegTxt = function() {
          $scope.regTxt = $scope.messages[$scope.currentColumn-1]["text"];
          $scope.updateNewRegTxt();
      }

      $scope.updateNewRegTxt = function () {
           if( $scope.regexp.regexp != undefined) {
                var re = new RegExp($scope.regexp.regexp, "gi");
                $scope.regNewTxt = $scope.regTxt.replace(re, function(str) {return '<mark>'+str+'</mark>'}); 
          } else {
            $scope.regNewTxt = $scope.regTxt;
          }
      }

      // auto update when typing
      $scope.$watch( "regexp.regexp", function(newVal, oldVal){
            // \b(([\w-]+://?|www[.])[^\s()<>]+(?:\([\w\d]+\)|([^\p{P}\s]|/)))
                $scope.updateNewRegTxt();
      }); 

      $scope.saveRegexp = function() {
          console.log($scope.regexp);
          Restangular.all('regexps').post($scope.regexp).then(function(regexp) {
              console.log(regexp);
              $scope.regexps.push(regexp);
              flash.success = "Your pattern has been saved";
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

    /*
    PROGRESS BAR
    */
     var stopLoader;
     $scope.readyToSave = false;
     $scope.loadingNetworks = {};
     $scope.loadingNetworks.percent= 0;

    // init socket.io
    socket.on('connect', function () {
          console.log('connect');
    });

    socket.on('progress', function (data) {
        // console.log("progress", );
        console.log(data);
        var d=JSON.parse(data)
        console.log(typeof(data), typeof(d));
        $scope.loadingNetworks=JSON.parse(data);
    });

     $scope.$watch("loadingNetworks", function(newVal, oldVal){

          console.log("loadingNetworks", newVal);

          if(newVal !=oldVal && newVal==1) {
              stopLoader=$interval( function  () {
                console.log("loadingNetworks started");
                socket.emit('progress', {"index_name": $scope.index});
              }, 200)

          } else if(newVal !=oldVal && newVal==100){
              $interval.cancel(stopLoader);
              stopLoader = undefined;
              console.log("done");

          }
     });


    // stopwords
    $scope.addWord =function() {
          if($scope.addedStopWord){
            // console.log($scope.addedStopWord);
            $scope.topogram.stopwords.push(this.addedStopWord);
            $scope.addedStopWord= '';
          }
    }



    /*
    TOPOGRAM API
    */

    $scope.createTopogram = function () {

      $scope.topogram.dataset_id = $routeParams.datasetId;
      $scope.topogram.es_query = $scope.searchTerm;
      $scope.topogram.es_index_name = $scope.index;

      console.log($scope.topogram);

      Restangular.all('topograms').post($scope.topogram).then(function(topogram) {
            $timeout(function() {
                $location.path("/datasets/"+ $routeParams.datasetId + "/topograms/" + topogram.id);
            })
            flash.success = "New topogram created !"

            // // words
            // $scope.words=topogram.words;
            // if(data.words.index!=undefined) $scope.wordsLength=topogram.words.index.length;
            // $scope.wordForceStarted = true;

            // // citations
            // $scope.showCommunities=false; 
            // $scope.citations=data.citations;
            // if(data.citations.index!=undefined) $scope.citationsLength=data.citations.index.length;
            // $scope.wordForceStarted = true;

      }, function (error){
          console.log(error);
          flash.error = error.data;
      });

    };

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
