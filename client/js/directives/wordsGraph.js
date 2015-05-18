Topogram.directive("words", function () {
     return {
        replace: false,
        scope: { 
              wordsGraph: '=wordsGraph',
              wordsForceStarted :'=wordsForceStarted'
        },
        link: function ($scope, element, attrs) {

            console.log("$scope.wordsGraph");

            //SVG Setup
            var w=900,
                h=500;

            // setup SVG
            var viz=d3.select(element[0]).append("svg")
                .attr("class","svg-viz")
                .style("background","#fff")
                .attr("width", w)
                .attr("height", h)
                .attr("preserveAspectRatio", "xMidYMid")
                .attr("viewBox", "0 0 " + w + " " + h);

            var divWords=viz.append("g").attr("class","wordzone")

            var wordEdges = divWords.append("g")
                        .attr("class", "wordgraph")

            var words = divWords.append("g")
                        .attr("class", "words")

            var wordsLegend=divWords.append("g")
                        .attr("class", "words-legend")
                        .attr("transform", "translate("+(100)+","+(h-200)+")");

            // data 
            $scope.$watch("wordsGraph.words", function(newVal,oldVal){
                console.log(newVal);
                if(newVal == undefined && newVal == oldVal) return // prevent error

                // init
                var wordsData = newVal;
                d3.selectAll(".word-link").remove();
                d3.selectAll(".word").remove();

                /*
                *   DATA : compute data and store in nodes
                */

                newVal

                // arrays to store coordonates  
                var wordsX={},
                      wordsY={};

                // update coordonates based on word and canvas size
                var updateWordXY= function () {
                    var margin=30,
                        rgx=d3.scale.linear().domain([0,wordNodes.length]).range([margin,w-margin-200]),
                        s=d3.shuffle(wordNodes),
                        rgy=d3.scale.linear().domain(fontScale).range([margin,h-150]);

                    for (var i = 0; i < wordNodes.length; i++) {
                        var d=s[i];
                        wordsX[d.id]=rgx(i);
                        wordsY[d.id]=rgy(wordScaleFont(d.weight));
                    };
                }

                // parse data properly                     
                var myWordNodes={},
                    myWordEdges={};

                // init data with a children array 
                for (var i = 0; i < wordsData.nodes.length; i++) {
                    wordsData.nodes[i].children=[];
                    wordsData.nodes[i].selected=false;
                };

                // add childrens to nodes
               for (var i = 0; i < wordsData.links.length; i++) {
                    var link =  wordsData.links[i];
                     wordsData.nodes[link.source].children.push(wordsData.nodes[link.target]);
                     wordsData.nodes[link.target].children.push(wordsData.nodes[link.source]);
                    link.source = wordsData.nodes[link.source] || 
                        (wordsData.nodes[link.source] = {name: link.source});
                    link.target = wordsData.nodes[link.target] || 
                        (wordsData.nodes[link.target] = {name: link.target});
                    link.value = link.weight;
                }

                /*
                *   DRAW : 
                */

                // create graph
                var wordForce=d3.layout.force()
                        .nodes(wordsData.nodes)
                        .links(wordsData.links)
                        .size([w,h])
                        .linkDistance(250)
                        .charge(-1500)
                        .gravity(.3)
                        .on("tick", tickWord);

                var wordPath=wordEdges.selectAll(".word-link")
                        .data(wordForce.links())
                
                wordPath.enter()
                    .append("line")
                    .attr("class", "word-link")

                var wordNodes=words.selectAll(".word")
                        .data(wordForce.nodes())

                wordNodes.enter()
                    .append("g")
                    .attr("class", "word")
                    
                if($scope.wordsForceStarted) {
                    wordForce.start();
                    wordNodes.call(wordForce.drag);
                }

                drawWords(); // init

                // scales
                var fontScale=[15,60],
                    wordScale=wordsData.nodes.map(function(d){return d.weight}),
                    maxMinWordScale=[Math.min.apply(Math,wordScale), Math.max.apply(Math,wordScale)],
                    wordScaleFont=d3.scale.linear().domain(maxMinWordScale).range(fontScale),
                    userPathColor=d3.scale.category20b(),
                    mapColor;
                
                $scope.selection=false;

                // drwa all words
                function drawWords() {
                    var ext=wordsData.nodes.map(function(d){ return d.children.length }), 
                        wordScaleSize=d3.scale.linear().domain(d3.extent(ext)).range([15, 45]),
                        wordScaleOpacity=d3.scale.linear().domain(d3.extent(ext)).range([.5,1]),
                        wordColor = d3.scale.linear().domain(d3.extent(ext)).range(["#a1d99b","#006d2c"]),
                        c=d3.scale.category10();
                    wordNodes.each(function (d, i) {

                        var self = d3.select(this);
                    
                        self.append("rect")
                            .attr("width", function(d) { return wordScaleSize(d.children.length) })
                            .attr("height", function(d) { return 20 })
                            .style("fill", function(d) {  return "transparent"; })
                            .style("stroke", function(d) { return "transparent" });

                        self.append("text")
                            .attr("dx", 12)
                            .attr("dy", 8)
                            .style("font-size", function(d) { return wordScaleSize(d.children.length) })//scale_size(d.btw_cent) })
                            .style("fill", function(d) {
                                return c(d.weight)
                            })
                            .style("fill-opacity", function(d) {  return "#006d2c" })
                            .style("fill-opacity", function(d) {  return wordScaleOpacity(d.weight) })
                            .attr("text-anchor", "middle") // text-align: right
                            .text(function(d) { return d.id });

                        var x=i*20;
                        var y=80;

                        wordsX[d.id]=x;
                        wordsY[d.id]=y;
                    })
                    .on("mouseover",function(d,i,event){
                        $scope.selection=true;
                        d.selected=true;
                        d.children.forEach(function(e){
                            e.selected=true;
                        })
                    }).on("mouseout",function(d,i){
                        $scope.selection=false;
                        d.selected=false;
                        d.children.forEach(function(e){
                            e.selected=false;
                        })
                        // d3.select(".pie-chart").remove()
                    });
                    // .on("click",function(d){
                    //     console.log(d);
                    // })
                    // ;

                    drawWordPath();
                }

                // colors
                function drawWordPath() {
                    var wordPathExt=wordsData.links.map(function(d){ return d.weight }),
                        wordPathWeight=d3.scale.linear().domain(d3.extent(wordPathExt)).range([1, 4]),
                        wordPathOpacity=d3.scale.linear().domain(d3.extent(wordPathExt)).range([.1, 1]);
                    
                    wordPath.each(function (d, i) {
                        var self = d3.select(this);
                        self.style("stroke", function(d) { return "#BBB" })
                            .style("stroke-width", function(d) {  return wordPathWeight(d.weight) })
                            .style("stroke-opacity", function(d) {  return wordPathOpacity(d.weight) });
                    })
                }

                // 
                var ext=wordsData.nodes.map(function(d){ return d.children.length }), 
                    wordScaleOpacity=d3.scale.linear().domain(d3.extent(ext)).range([.5,1]);

                function tickWord() {

                    // remove transition for force
                    var ww = ($scope.wordsForceStarted)? wordNodes : wordNodes.transition();

                    ww.attr("transform", function(d) { 
                    
                        var r=wordScaleFont(d.children.length),
                            x=(d.x==undefined || !$scope.wordsForceStarted)? wordsX[d.id] : Math.max(r, Math.min(w - r, d.x)),
                            y=(d.y==undefined || !$scope.wordsForceStarted)? wordsY[d.id] : Math.max(r, Math.min(h - r, d.y));

                        wordsX[d.id]=x;
                        wordsY[d.id]=y;

                        return "translate(" + x + "," + y + ")"; 

                    }).attr("fill-opacity",function(d){
                        // return 1
                        if($scope.selection) {
                            if(!d.selected) return 0.2;
                            else return 1 // wordScaleOpacity(d.children.length);
                        } else return 1 // wordScaleOpacity(d.children.length);
                    });

                    tickWordPath();
                }

                function tickWordPath() {
                    var wordPathExt=wordsData.links.map(function(d){ return d.weight }),
                        wordPathWeight=d3.scale.linear().domain(d3.extent(wordPathExt)).range([1, 4]),
                        wordPathOpacity=d3.scale.linear().domain(d3.extent(wordPathExt)).range([.1, 1]);

                    wordPath.each(function (d, i) {
                        var self=d3.select(this);

                        self.style("stroke-opacity", function(d) { 
                             if($scope.selection) {
                                if( d.target.selected && d.source.selected) return wordPathOpacity(d.weight)
                                else return 0;
                            } else return wordPathOpacity(d.weight);

                        })
                        
                        var w=wordForce.size()[0],
                            h=wordForce.size()[1],
                            r1=wordScaleFont(d.source.weight),
                            x1=Math.max(r1, Math.min(w, d.source.x));
                            y1=Math.max(r1, Math.min(h, d.source.y)),
                            r2=wordScaleFont(d.target.weight),
                            x2=Math.max(r2, Math.min(w, d.target.x)),
                            y2=Math.max(r2, Math.min(h, d.target.y));

                        if(!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
                            self.attr("x1", x1)
                                .attr("y1", y1)
                                .attr("x2", x2)
                                .attr("y2", y2)
                        }
                    })       
                }

            });
        }
    }
})
