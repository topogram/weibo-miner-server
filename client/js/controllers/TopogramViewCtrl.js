function TopogramViewCtrl($scope, $routeParams, $timeout, $location, Restangular, searchService, TopogramService, ConfigService) {


    // INIT
    $scope.messages = [];
    $scope.page = 0;        // A counter to keep track of our current page
    $scope.allResults = false;  // Whether or not all results have been found.

    
    // load topogram
    Restangular.one('datasets',$routeParams.datasetId).one("topograms", $routeParams.topogramId).get().then(function(topogram) {
            console.log(topogram);
            
            $scope.topogram = topogram;
            $scope.dataset = topogram.dataset;

            $scope.columns = [{"title": "Text", 'field': "text"}, {"title": "Creation Date", 'field': "created_at"},{"title": "Author", 'field': "source"} ]; 

            // SEARCH RESULTS
            searchService.search($scope.topogram.es_index_name, $scope.topogram.es_query).then(function(results){

              $scope.totalResults=results.total;

                var ii = 0;
                for(;ii < results.messages.length; ii++){
                  $scope.messages.push(results.messages[ii]);
                }

              if(results.histogram.length){
                  $scope.start=results.histogram[0].time;
                  $scope.end=results.histogram[results.histogram.length-1].time;
                  $scope.timeData=results.histogram;
              }
        });


      });

    $scope.wordsLimit = 10;
    $scope.citationsLimit = 10;

    // WORDS 
    Restangular.one('topograms',$routeParams.topogramId).one('words', $scope.wordsLimit).get().then(function(words) {
        console.log(words);
        $scope.words=words;
        $scope.wordsForceStarted = true;

    });

    // CITATIONS 
    Restangular.one('topograms',$routeParams.topogramId).one('citations', $scope.citationsLimit).get().then(function(citations) {
        console.log(citations);
        $scope.citations=citations;
        $scope.citationsForceStarted = true;
    });

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
              // words
              $scope.words=topogram.words;
              if(data.words.index!=undefined) $scope.wordsLength=topogram.words.index.length;
              $scope.wordForceStarted = true;

              // citations
              $scope.showCommunities=false; // show provinces clustering or communities

              $scope.citations=data.citations;
              if(data.citations.index!=undefined) $scope.citationsLength=data.citations.index.length;
              $scope.wordForceStarted = true;

            */



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

    /*Restangular.one('datasets',$routeParams.datasetId).one("topograms", $routeParams.topogramId).get().then(function(topogram) {
        console.log(topogram);
        $scope.topogram = topogram;
        $scope.topogramName= topogram.dataset.title;
    });

    Restangular.one('datasets',$routeParams.datasetId).one("topograms", $routeParams.topogramId).getList("timeframes").then(function(timeframes) {
            $scope.timeframes = timeframes;

            // x1000 for JS ts
            $scope.timeSeriesData = timeframes;
            $scope.timeSeriesData.map(function(d){ d.timestamp=d.timestamp*1000});

            $scope.timeMax=$scope.timeSeriesData.length;
            $scope.start=$scope.timeSeriesData[0].timestamp;
            $scope.end=$scope.timeSeriesData[timeframes.length-1].timestamp;

            $scope.updateTimeData();

        });

    $scope.updateTimeData=function () {
        $scope.timeSeriesData.forEach(function(d) {
            if(d.timestamp>$scope.start && d.timestamp<$scope.end) d.selected=true
                else d.selected=false
                    d.time=new Date(d.timestamp);
            });
    }

    $scope.stop = function(){
        $timeout.cancel($scope.playFrame);
    }

    var i,step,frames;

    $scope.playAll=function (){
        step=10,
        i=step, 
        frames=$scope.timeSeriesData.length/step;
        $timeout($scope.playFrame,100);
    }

    $scope.playFrame=function() {

        var t0=$scope.timeSeriesData[i-step].timestamp;
        var t1=$scope.timeSeriesData[i].timestamp;

        $scope.end=t1;
        console.log(t0,t1);

        i+=step;
        $timeout($scope.playFrame,100)
    }

    // // monitor time changes
    $scope.$watch('start', function(newStart, oldVal) {
        if (newStart!=undefined) {
              $scope.start=newStart; 
              $scope.updateTimeData();
              ConfigService.start = newStart
              $scope.updateData();
        }
    })

    $scope.$watch('end', function(newEnd, oldVal) {
        if (newEnd!=undefined) {
          $scope.end=newEnd; 
          $scope.updateTimeData();
          ConfigService.end = newEnd;
          $scope.updateData();
        }
    })

    $scope.updateData=function () {

        if($scope.start!=undefined && $scope.end!=undefined && ($scope.prevStart!=$scope.start || $scope.prevEnd!=$scope.end)) {

            Restangular.one('datasets',$routeParams.datasetId).one("topograms", $routeParams.topogramId).one("timeframes", $scope.start/1000).getList($scope.end/1000).then(function(data) {

                data=data[0];

                // TopogramService.citations.nodes=data.citations.nodes;
                // TopogramService.citations.edges=data.citations.edges;
                // TopogramService.citations.index=data.citations.index;
                // TopogramService.words.nodes=data.words.nodes;
                // TopogramService.words.edges=data.words.edges;
                // TopogramService.words.index=data.words.index;

                // words
                $scope.words=data.words;
                if(data.words.index!=undefined) $scope.wordsLength=data.words.index.length;
                $scope.wordForceStarted = true;

                // citations
                $scope.showCommunities=false; // show provinces clustering or communities

                $scope.citations=data.citations;
                if(data.citations.index!=undefined) $scope.citationsLength=data.citations.index.length;
                $scope.wordForceStarted = true;

                $scope.citationForceStarted=true;
            });

        }

    }

    $scope.saveWords=function(){
        var fn="words_"+config.getFilename()
        var sv=new Simg($(".words-container svg")[0]);
        sv.download(fn);
    }
*/
}
