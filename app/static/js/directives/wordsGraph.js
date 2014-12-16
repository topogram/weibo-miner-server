Topogram.directive("words", function () {
     return {
        replace: false,
        restrict: 'E',
        link: function ($scope, element, attrs) {

            console.log($scope);

            //SVG Setup
            var w=900,
                h=500;

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
                    
            $scope.$watch('topogramName', function(newVal, oldVal) {
                // console.log(newVal);
                if(newVal!=undefined) {                           
                    wordsLegend.append("text")
                        .attr("dx",1)
                        .attr("dy",12)
                        .text("Words correlation for '"+newVal+"'")
                        .style("fill","#404040")
                        .style("margin-left",5)
                        .style("font-size",10)
                        .call(wrap, 135);

                    wordsLegend.append("text")
                        .attr("transform","translate(0,30)")
                        .attr("dx",1)
                        .attr("dy",10)
                        .text("Weighted co-occurences in tweets for 500 most used words")
                        .style("fill","#aaa")
                        .style("margin-left",5)
                        .style("font-size",10)
                        .call(wrap, 150);
                }
            });

            function wrap(text, width) {
                text.each(function() {
                    var text = d3.select(this),
                        words = text.text().split(/\s+/).reverse(),
                        word,
                        line = [],
                        lineNumber = 0,
                        lineHeight = 0.7, // ems
                        y = text.attr("y"),
                        dy = parseFloat(text.attr("dy")),
                        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy );
                    while (word = words.pop()) {
                      line.push(word);
                      tspan.text(line.join(" "));
                      if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy ).text(word);
                      }
                    }
                });
            }
            
            // data 
            $scope.$watch("wordsLength", function(newVal,oldVal){

                if(newVal==undefined) return
                var wordsData=$scope.words;

                d3.selectAll(".word-link").remove();
                d3.selectAll(".word").remove();

                var wordsX={},
                    wordsY={};

                updateWordXY= function updateWordXY() {

                    var margin=30,
                        rgx=d3.scale.linear().domain([0,wordNodes.length]).range([margin,w-margin-200]),
                        s=d3.shuffle(wordNodes),
                        rgy=d3.scale.linear().domain(fontScale).range([margin,h-150]);

                    for (var i = 0; i < wordNodes.length; i++) {
                        var d=s[i];
                        wordsX[d.name]=rgx(i);
                        wordsY[d.name]=rgy(wordScaleFont(d.count));
                    };
                }

                // parse data properly                     
                var myWordNodes={},
                    myWordEdges={};

                for (var i = 0; i < wordsData.nodes.length; i++) {
                    myWordNodes[wordsData.nodes[i]["name"]]=wordsData.nodes[i];
                    wordsData.nodes[i].children=[];
                    wordsData.nodes[i].selected=false;
                };

                wordsData.edges.forEach(function(link) {
                    // console.log(link.weight);
                     myWordNodes[link.source].children.push(myWordNodes[link.target]);
                     myWordNodes[link.target].children.push(myWordNodes[link.source]);

                    link.source = myWordNodes[link.source] || 
                        (myWordNodes[link.source] = {name: link.source});
                    link.target = myWordNodes[link.target] || 
                        (myWordNodes[link.target] = {name: link.target});
                    link.value = link.weight;
                });

                var wordForce=d3.layout.force()
                        .nodes(wordsData.nodes)
                        .links(wordsData.edges)
                        .size([w,h])
                        .linkDistance(150)
                        .charge(-1000)
                        .gravity(.4)
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
                    
                if($scope.wordForceStarted) {
                    wordForce.start();
                    wordNodes.call(wordForce.drag);
                }

                drawWords();

                // scales
                var fontScale=[15,60],
                    wordScale=wordsData.nodes.map(function(d){return d.count}),
                    maxMinWordScale=[Math.min.apply(Math,wordScale), Math.max.apply(Math,wordScale)],
                    wordScaleFont=d3.scale.linear().domain(maxMinWordScale).range(fontScale),
                    userPathColor=d3.scale.category20b(),
                    mapColor;
                
                $scope.selection=false;

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
                                // return 
                                // "#006d2c" 
                                // console.log(d);
                                return c(d.community)
                            })
                            // .style("fill-opacity", function(d) {  return "#006d2c" })
                            // .style("fill-opacity", function(d) {  return wordScaleOpacity(d.count) })
                            .attr("text-anchor", "middle") // text-align: right
                            .text(function(d) { return d.name });

                        var x=i*20;
                        var y=80;

                        wordsX[d.name]=x;
                        wordsY[d.name]=y;
                    }).on("mouseover",function(d,i,event){
                        // console.log(d3.mouse());Z
                        
                        $scope.selection=true;
                        d.selected=true;
                        d.children.forEach(function(e){
                            e.selected=true;
                        })
                        
                        // drawWordPie(divWords.append("g").attr("transform",'translate(100,50)'),
                        //     // $scope.wordProvinces[d.name],
                        //     d.name
                        //     )

                    }).on("mouseout",function(d,i){

                        $scope.selection=false;
                        d.selected=false;
                        d.children.forEach(function(e){
                            e.selected=false;
                        })
                        d3.select(".pie-chart").remove()

                    });
                    // .on("click",function(d){
                    //     console.log(d);
                    // })
                    // ;

                    drawWordPath();
                }

                function drawWordPie(element, _data, _word) {

                  element.select(".pie-chart").remove()


                    // parse only more than 3 % and group others
                    data=[];
                    var t=d3.sum(_data.map(function(d){ return d.value }));
                    var others=0;

                    
                    _data.forEach(function (d){
                        if(d.label == 0) return
                        if(d.value/t*100>7) data.push({"label":d.label,
                                    "color": $scope.geoColors[d.label], 
                                    "value": d.value})
                        else others+=d.value
                    })
                    if(others!=0) data.push({"label":"Others",
                                        "color": "#CCC", 
                                        "value": others})

                    var width = 200,
                        height = 200,
                        radius = Math.min(width, height) / 2;

                    var arc = d3.svg.arc()
                      .outerRadius(radius - 10)
                      .innerRadius(0);

                    var pie = d3.layout.pie()
                      .sort(null)
                      .value(function(d) { return d.value; });

                    var svg = element
                      .append("g")
                      .attr("class","pie-chart")
                      .attr("width", 200)
                      .attr("height", 200)
                      .append("g")
                      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

                    var g = svg.selectAll(".arc")
                        .data(pie(data))
                        .enter();

                    g.append("path")
                      .attr("class", "arc")
                      .attr("d", arc)
                      .attr("data-legend", function(d){ return d.data.label })
                      .style("fill", function(d) { return d.data.color; });

                    g.append("text")
                      .attr("transform", function(d) { 
                        return "translate(" + arc.centroid(d) + ")"; 
                    })
                      .attr("dy", ".25em")
                      .style("fill","#000")
                      .style("fill-opacity","0.8")
                      .style("text-anchor", "middle")
                      .style("font-size", 10)
                      .style("fill","#000")
                      .text(function(d) { return d.data.label; });

                    svg.append("text")
                      .attr("class", "legend")
                      .style("text-anchor", "middle")
                      .style("font-size", 11)
                      .style("fill","#404040")
                      .attr("transform", "translate(0,"+(-width/2)+")")
                      .text("Word: "+_word)
                }

                function drawWordPath() {

                    var wordPathExt=wordsData.edges.map(function(d){ return d.weight }),
                        wordPathWeight=d3.scale.linear().domain(d3.extent(wordPathExt)).range([1, 4]),
                        wordPathOpacity=d3.scale.linear().domain(d3.extent(wordPathExt)).range([.1, 1]);
                    
                    wordPath.each(function (d, i) {
                        var self = d3.select(this);
                        
                        self.style("stroke", function(d) { return "#de2d26" })
                            .style("stroke-width", function(d) {  return wordPathWeight(d.weight) })
                            .style("stroke-opacity", function(d) {  return wordPathOpacity(d.weight) });
                    })
                }

                var ext=wordsData.nodes.map(function(d){ return d.children.length }), 
                    wordScaleOpacity=d3.scale.linear().domain(d3.extent(ext)).range([.5,1]);

                function tickWord() {

                    // remove transition for force
                    var ww = ($scope.wordForceStarted)? wordNodes : wordNodes.transition();

                    ww.attr("transform", function(d) { 
                    
                        var r=wordScaleFont(d.children.length),
                            x=(d.x==undefined || !$scope.wordForceStarted)? wordsX[d.name] : Math.max(r, Math.min(w - r, d.x)),
                            y=(d.y==undefined || !$scope.wordForceStarted)? wordsY[d.name] : Math.max(r, Math.min(h - r, d.y));

                        wordsX[d.name]=x;
                        wordsY[d.name]=y;

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
                    var wordPathExt=wordsData.edges.map(function(d){ return d.weight }),
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
                            r1=wordScaleFont(d.source.count),
                            x1=Math.max(r1, Math.min(w, d.source.x));
                            y1=Math.max(r1, Math.min(h, d.source.y)),
                            r2=wordScaleFont(d.target.count),
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
