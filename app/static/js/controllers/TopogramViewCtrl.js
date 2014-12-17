function TopogramViewCtrl($scope, $routeParams, $timeout, $location, Restangular, TopogramService, ConfigService) {

    Restangular.one('datasets',$routeParams.datasetId).one("topograms", $routeParams.topogramId).get().then(function(topogram) {

         // GRAPHS
            var topoInfo = {
              "es_query" : topogram.es_query,
              "es_index_name" : topogram.es_index_name,
              "dataset_id" : topogram.dataset_id,
              "topotype_id" : topogram.dataset.topotype_id,
              "citations_limit" : 50,
              "words_limit" : 50
            };

            Restangular.all('topograms').all('networks').post(topoInfo).then(function(topogram) {

              // words
              $scope.words=topogram.words;
              if(data.words.index!=undefined) $scope.wordsLength=topogram.words.index.length;
              $scope.wordForceStarted = true;

              // citations
              $scope.showCommunities=false; // show provinces clustering or communities

              $scope.citations=data.citations;
              if(data.citations.index!=undefined) $scope.citationsLength=data.citations.index.length;
              $scope.wordForceStarted = true;

            });
        });

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
