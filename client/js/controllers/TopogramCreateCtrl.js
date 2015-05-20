function TopogramCreateCtrl($scope, $routeParams, $location, Restangular, flash, searchService, socket, $timeout, $interval) {

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
          $scope.dataset.filename =  dataset.filepath.replace(/^.*[\\\/]/, ''); // extract just file name
          // console.log(dataset);

          // additional columns
          if(dataset.additional_columns) {
            var addCol = dataset.additional_columns.split(",")
            for (i in addCol) {
              $scope.columns.push({ "title": addCol[i] ,"field": addCol[i]});
            }
          }

          // load data
          Restangular.one('datasets',$routeParams.datasetId).one("size").get().then(function(datasetSize) {
                // console.log($scope.dataset);
                $scope.dataset.size = datasetSize.count;
                // load number of posts to estimate the size of the graph 
                $scope.topogram.words_limit = Math.round(datasetSize.count / 25); // for now, arbitrary value 
          });
    });


        // init socket.io
        socket.on('connect', function () {
              console.log('connect');
        });

        socket.on('progress', function (data) {
            console.log(data);
            // var d=JSON.parse(data)
            // console.log(typeof(data), typeof(d));
            // $scope.loadingNetworks=JSON.parse(data);
        });
      

      $scope.recordOffset = 0;
      $scope.recordStep = 100;
      
      $scope.getRecords = function(start,qty) {
          Restangular.one('datasets',$routeParams.datasetId).one("from", $scope.recordOffset).one("qty",$scope.recordStep ).get().then(function(datasample) {
              var data = JSON.parse( JSON.parse(datasample));
              // console.log(data);
              $scope.messages = data;
          });
        }

      $scope.getNextRecords =function() {
        if ($scope.recordOffset + $scope.recordStep >  $scope.dataset.size) return
        $scope.recordOffset = $scope.recordOffset + $scope.recordStep ;
        $scope.getRecords($scope.recordStart, $scope.recordQty);
      }

      $scope.getPrevRecords =function() {
        if( $scope.recordOffset - $scope.recordStep < 0) return
        $scope.recordOffset = $scope.recordOffset - $scope.recordStep ;
        $scope.getRecords($scope.recordStart, $scope.recordQty);
      }

      $scope.getRecords(0, $scope.recordQty); // init

      // most frequent words 
      $scope.topogram.frequent_words_limit = 50;
      $scope.getMostFrequentWords = function() {
          Restangular.one('datasets',$routeParams.datasetId).one("frequentWords").one(String($scope.topogram.frequent_words_limit)).get().then(function(frequentWords) {
                // console.log(frequentWords);
                $scope.frequentWords = frequentWords;
          });
      }

    // word graph
    $scope.topogram.words_limit = 0;
    $scope.wordsGraphLoading = false;

    
    $scope.getWordsGraph = function() {
        $scope.wordsGraphLoading = true; // display loader
        $scope.wordsGraphTooBig = false;
        
        // require graph to server
        var data = { "dataset": $scope.dataset , "words_limit" : $scope.topogram.words_limit  }
        console.log(data);

         Restangular.one('datasets',$routeParams.datasetId).one("words").one(String($scope.topogram.words_limit)).get().then(function(wordsGraph) {
            if (wordsGraph.top_words.length > 250) {
              $scope.wordsGraphTooBig = true;
              $scope.wordsGraphLoading = false;

            } else {
              $scope.wordsGraph=wordsGraph;
              $scope.wordsForceStarted = true;
              console.log($scope.wordsGraph);
              $scope.wordsGraphLoading = false;
            }
            
        });
        
    }

    

       



    // time series
    $scope.getTimeSeries = function() {
        Restangular.one('datasets',$routeParams.datasetId).one("timeSeries").get().then(function(timeSeries) {
            console.log(timeSeries);
            $scope.start=timeSeries[0].time;
            $scope.end=timeSeries[timeSeries.length-1].time;
            $scope.timeData = timeSeries.map(function(d){
                return { "count" : d.count, "time" : new Date(d.time*1000)};
            });
        });
    }

    /*
    STOPWORDS
    */

    // stopwords
    $scope.addWord =function() {
          if($scope.addedStopWord){
            // console.log($scope.addedStopWord);
            $scope.topogram.stopwords.push(this.addedStopWord);
            $scope.addedStopWord= '';
          }
    }

    /* SAVE IMAGES */
    $('body').keydown(function (e) {
          if(e.which==87 && e.shiftKey==true) $scope.saveWords() // W
          else if (e.which==71 && e.shiftKey==true) $scope.saveMap() // G
          else if (e.which==67 && e.shiftKey==true) $scope.saveUsers() //C
          else if (e.which==84 && e.shiftKey==true) $scope.saveTimeSeries()
          else if (e.which==65 && e.shiftKey==true) $scope.saveAll()
    });

    $scope.saveTimeSeries = function(){
      var fn="time_"+$scope.dataset.title;
      $scope.downloadPNG($("#timeseries  svg")[0], fn);
      // var sv=new Simg($("#timeseries  svg")[0]);
      // sv.download();
    }

    $scope.saveWords = function(){
      var name ="words_"+$scope.dataset.title;
      $scope.downloadPNG($(".words-container svg")[0], name);
       // var sv=new Simg($(".words-container svg")[0]);
       // sv.download();
    }

    $scope.downloadPNG=function(container, name) {

        var sv=new Simg(container);
        // console.log(sv);
        // sv.download();
        // sv.downloadWithName(name);

        // rewrite download function
         sv.toImg(function(img){
           var a = document.createElement("a");
           a.download = name+".png";
           a.href = img.getAttribute('src');
           a.click();
         });

    } // end controller

    $scope.downloadAsCSV = function(dataObject, filename) {
        // remove angular verbose stuff
        var cleanObject = dataObject.map(function(d) { delete d["$$hashKey"] ; return d})
        // convert to csv dialect
        var csv = ConvertToCSV( cleanObject);
        // download as file
        var hiddenElement = document.createElement('a');
        hiddenElement.href = 'data:attachment/csv,' + encodeURI(csv);
        hiddenElement.target = '_blank';
        hiddenElement.download = filename+'.csv';
        hiddenElement.click();
    }

     function ConvertToCSV(objArray) {
            var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
            var str = '';

            for (var i = 0; i < array.length; i++) {
                var line = '';
            for (var index in array[i]) {
                if (line != '') line += ','

                line += array[i][index];
            }

            str += line + '\r\n';
        }

        return str;
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
