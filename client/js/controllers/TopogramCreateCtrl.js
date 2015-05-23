function TopogramCreateCtrl($scope, $routeParams, $location, Restangular, flash, socket, $timeout, $interval, $filter) {

    // Initialize the scope defaults.
    $scope.topogram = {};
    $scope.topogram.stopwords = [];

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


      $scope.topogram.searchTerm;
      $scope.searchResultsCount = 0;
     $scope.search = function() {
        // console.log($scope.topogram.searchTerm);
        Restangular.one('datasets',$routeParams.datasetId).one("search").get({"q" : $scope.topogram.searchTerm}).then(function(results) {
            console.log( results );
            $scope.searchResultsCount = results.count;
        }) 
      }

     // $scope.$watch("searchTerm", function(newVal, oldVal){
     //      console.log(newVal);
     //  });

      $scope.recordOffset = 0;
      $scope.recordStep = 100;
      // sorting 
      $scope.sortMessages = {};
      $scope.sortMessages.order = "1"; // 1 is up, -1 is down
      $scope.sortMessages.column = null;

      $scope.getRecords = function(start,qty) {
          Restangular.one('datasets',$routeParams.datasetId).one("from", $scope.recordOffset).one("qty",$scope.recordStep ).get({"sort_order" : $scope.sortMessages.order, "sort_column" : $scope.sortMessages.column }).then(function(datasample) {

              var data = JSON.parse( JSON.parse(datasample));

              $scope.messages = data.map(function(d) {
                  var date = new Date(d.time_column.$date);
                  delete(d.time_column);
                  d.time_column = $filter('date')(date, "EEE dd MMM yyyy -  HH:mm:ss Z"); 
                  delete(d.keywords);
                  delete(d._id);
                  return d;
              });

              $scope.columns = Object.keys(data[0]);

          });
        }

      $scope.sortMessagesBy = function(column) {
          $scope.sortMessages.column = column;
          $scope.sortMessages.order = ($scope.sortMessages.order == "1") ? -1 : 1;
          $scope.recordOffset = 0;
          $scope.getRecords(0, $scope.recordStep);

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
          Restangular.one('datasets',$routeParams.datasetId).one("frequentWords").one(String($scope.topogram.frequent_words_limit)).get({"q" : $scope.topogram.searchTerm, "stopwords" : JSON.stringify($scope.topogram.stopwords) }).then(function(frequentWords) {
                // console.log(frequentWords);
                $scope.topogram.frequentWords = frequentWords;
          });
      }

    // word graph
    $scope.topogram.nodes_count = 250;
    $scope.topogram.min_edge_weight = 50;
    $scope.wordsGraphLoading = false;

    $scope.getWordsGraph = function() {
        // $scope.wordsGraphTooBig = false;
        $scope.wordsGraphLoading = true; // display loader

        // require graph to server
         Restangular.one('datasets',$routeParams.datasetId).one("words")
         .get({
            "q" : $scope.topogram.searchTerm , 
            "stopwords" :  JSON.stringify($scope.topogram.stopwords), 
            "nodes_count" : $scope.topogram.nodes_count,
            "min_edge_weight" : $scope.topogram.min_edge_weight
            }).then(function(wordsGraph) {
              
              console.log(wordsGraph);

              $scope.wordsGraph=wordsGraph;
              $scope.wordsForceStarted = true;
              console.log($scope.wordsGraph);
              $scope.wordsGraphLoading = false;

        });
    }

    // time series
     $scope.topogram.timeScale = "day";
    $scope.$watch("topogram.timeScale", function(newVal,oldVal) {
      if(newVal != undefined && newVal != oldVal) {
        console.log(newVal);
        $scope.getTimeSeries();
      }
    });

    $scope.getTimeSeries = function() {
          Restangular.one('datasets',$routeParams.datasetId).one("timeSeries").get({
            "q" : $scope.topogram.searchTerm , 
            "stopwords" :  JSON.stringify($scope.topogram.stopwords), 
            "time_scale" : $scope.topogram.timeScale 
          }).then(function(timeSeries) {
            $scope.start=timeSeries[0].time;
            $scope.end=timeSeries[timeSeries.length-1].time;
            $scope.timeData = timeSeries.map(function(d){
                return { "count" : d.count, "time" : new Date(d.time*1000)};
            });
            $scope.topogram.timeSeries  = $scope.timeData;
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

    $scope.removeStopword = function(stopword) {
      $scope.topogram.stopwords.pop(stopword);

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

    $scope.saveTopogram = function () {
        console.log($scope.topogram);

        $scope.topogram.dataset_id =  $routeParams.datasetId;

        Restangular.all('topograms').post($scope.topogram).then(function(topogram) {
              console.log(data);
              flash.success = "New topogram saved !"
              }, function (error){
                  console.log(error);
                  flash.error = error.data;
              });
    }
    /*
    

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
        "es_query" : $scope.topogram.searchTerm,
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
            "es_query" : $scope.providerhTerm,
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
