function TopogramCreateCtrl($scope, $routeParams, $location, Restangular, flash, searchService, socket, $interval) {

      socket.on('connect', function () {
            console.log('connect');
      });

  Restangular.one('datasets',$routeParams.datasetId).get().then(function(dataset) {
    $scope.dataset = dataset;
        // $scope.datasetId = dataset.id;

        $scope.index = dataset.index_name;
        $scope.stopwords = [];
        var stops = dataset.topotype.stopwords.split(",");
        for (var i = 0; i < stops.length; i++) {
          $scope.stopwords.push({"word" : stops[i]})
        }

        socket.emit('progress', {"index_name": $scope.index});

        // console.log($scope.stopwords);
      });

  $scope.addWord =function() {
    if($scope.addedStopWord){
      console.log($scope.addedStopWord);
      $scope.stopwords.push({"word" :this.addedStopWord});
      $scope.addedStopWord= '';
    }
  }

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
      // $location.search({'q': $scope.searchTerm,
      //                  "index":$scope.index}
      //                  );
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

    $scope.maxWords = 10;
    $scope.wordsLimit=5;

    $scope.citationsLimit=5;
    $scope.maxCitations = 10;

    $scope.$watch("wordsLimit", function(value) {
      console.log('new words limit : ' + value);
    });

    $scope.$watch("citationsLimit", function(value) {
      console.log('new citations limit : ' + value);
    });

     var stopLoader;
     $scope.readyToSave = false;
     $scope.loadingNetworks = {};
     $scope.loadingNetworks.percent= 0;

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

    /**
     * A fresh search. Reset the scope variables to their defaults, set
     * the q query parameter.
     */


     $scope.searchFirst= function(){ 

        $scope.readyToSave = false;
        searchService.search($scope.index,$scope.searchTerm).then(function(results){

            // console.log("search success");
            console.log(results);

            // display all columns (except  exludedColumns)
            var exludedColumns =["words_cited_edges", "words_edges", "cited_edges", "cited_nodes", "words_nodes", "timestamp"];

            // TITLE
            $scope.title=$scope.searchTerm;

            // TABLE : display some results
            for (colName in results.messages[0]) {
                // console.log(colName);
                if(exludedColumns.indexOf(colName) == -1) 
                  $scope.columns.push({"title": colName, 'field': colName})
              };

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

            // GRAPHS
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

          });

};

$scope.createTopogram = function () {
  console.log($scope);

  var topoInfo = {
    "es_query" : $scope.searchTerm,
    "es_index_name" : $scope.index,
    "description" : $scope.description,
    "dataset_id" : $routeParams.datasetId,
    "topotype_id" : $scope.dataset.topotype_id,
    "records_count" : $scope.totalResults
  };

  Restangular.all('topograms').post(topoInfo).then(function(topogram) {

   flash.success = "New topogram created !"

            // words
            $scope.words=topogram.words;
            if(data.words.index!=undefined) $scope.wordsLength=topogram.words.index.length;
            $scope.wordForceStarted = true;

            // citations
            $scope.showCommunities=false; 
            $scope.citations=data.citations;
            if(data.citations.index!=undefined) $scope.citationsLength=data.citations.index.length;
            $scope.wordForceStarted = true;

          });
};

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


$('body').keydown(function (e) {
      if(e.which==87 && e.shiftKey==true) $scope.saveWords() // W
      else if (e.which==71 && e.shiftKey==true) $scope.saveMap() // G
      else if (e.which==67 && e.shiftKey==true) $scope.saveUsers() //C
      else if (e.which==84 && e.shiftKey==true) $scope.saveTime()
      else if (e.which==65 && e.shiftKey==true) $scope.saveAll()
});

$scope.saveAll = function () {
  $scope.saveTime();
  $scope.saveWords();
  // $scope.saveMap();
  $scope.saveUsers();
}

$scope.saveTime = function(){
  var sv=new Simg($(".time-container svg")[0]);
  var fn="time_"+$scope.dataset.title +"_"+$scope.searchTerm
  sv.download(fn);
}

$scope.saveWords = function(){
  var name ="words_"+$scope.dataset.title +"_"+$scope.searchTerm;
  // $scope.downloadPNG($(".words-container svg")[0], name);
     var sv=new Simg($(".words-container svg")[0]);
     console.log(sv);
     sv.download();
}

$scope.saveUsers = function(){
  var name ="users_"+$scope.dataset.title +"_"+$scope.searchTerm;
  $scope.downloadPNG($(".user-container svg")[0], name);
}

$scope.downloadPNG=function(container, name) {
     console.log(name);
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
}

} // end controller
