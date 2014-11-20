Topogram.directive("citations", function () {
     return {
        replace: false,
        restrict: 'E',
        link: function ($scope, element, attrs) {
            
            var svg_w=d3.select(element[0]).style('width'),
                h=500,
                w=1600;
            
            var sw=1,
                sh=1,
                sx=0,
                sy=0;

            var viz=d3.select(element[0]).append("svg")
                .attr("class","svg-viz")
                .style("background","#fff")
                .attr("width", w)
                .attr("height", h)
                .attr("preserveAspectRatio", "xMidYMid")
                .attr("viewBox", "0 0 "+ w + " " + h)
                

            var divCitations=viz.append("g").attr("class","citationzone")
                    .attr("transform","scale("+sh+","+sw+") translate("+sx+","+sy+")")

            var citationEdges = divCitations.append("g")
                        .attr("class", "citationgraph")

            var citations = divCitations.append("g")
                        .attr("class", "citations")

            var citationsLegend=divCitations.append("g")
                        .attr("class", "citations-legend")
                        .attr("transform", "translate("+(20)+","+(h-50)+")");
                    
            $scope.$watch('memeName', function(newVal, oldVal) {
                console.log(newVal);
                if(newVal!=undefined) {                           
                    citationsLegend.append("text")
                        .attr("dx",1)
                        .attr("dy",12)
                        .text("Conversational graph for '"+newVal+"'")
                        .style("fill","#404040")
                        .style("margin-left",5)
                        .style("font-size",10)
                        .call(wrap, 135);

                    citationsLegend.append("text")
                        .attr("transform","translate(0,30)")
                        .attr("dx",1)
                        .attr("dy",10)
                        .text("Citations interactions (@,RT)")
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

            var citationColor=d3.scale.category20b();

            $scope.$watch("citationsLength", function(newVal,oldVal){
                if(newVal==undefined) return
                // console.log(newVal);
                var citationData=$scope.citations;

                // parse data properly                     
                var myCitationsNodes={}
                var color = d3.scale.category20c();

                for (var i = 0; i < citationData.nodes.length; i++) {
                    myCitationsNodes[citationData.nodes[i]["name"]]=citationData.nodes[i];
                    citationData.nodes[i].children=[];
                    citationData.nodes[i].selected=false;
                };

                citationData.edges.forEach(function(link) {

                    myCitationsNodes[link.source].children.push(myCitationsNodes[link.target]);
                    myCitationsNodes[link.target].children.push(myCitationsNodes[link.source]);

                    link.source = myCitationsNodes[link.source] || 
                        (myCitationsNodes[link.source] = {name: link.source});
                    link.target = myCitationsNodes[link.target] || 
                        (myCitationsNodes[link.target] = {name: link.target});
                    link.value = link.weight;
                });


                // TODO : move data logic to controllers
                var myCommunities={},
                    myProvinces={},
                    leaders={};

                var communities=citationData.nodes.map(function(d){
                    if(myCommunities[d.community]== undefined) myCommunities[d.community]=[]
                        myCommunities[d.community].push(d);
                        return d.community
                })
                
                for (com in myCommunities) {
                    myCommunities[com].sort(function(a,b){ return b.count-a.count});
                    leaders[com]=myCommunities[com][0]; // keep only the biggest node
                    
                    // count by provinces
                    var pc=count(myCommunities[com].map(function(d){ return d.province }))
                    myProvinces[com]=[]
                    for (p in pc) { 
                        myProvinces[com].push({"label":p, "value":pc[p], "color": color(p)})
                    }
                }

                function count(arr){
                    var obj={}
                    for (var i = 0, j = arr.length; i < j; i++) {
                       if (obj[arr[i]]) {
                          obj[arr[i]]++;
                       }
                       else {
                          obj[arr[i]] = 1;
                       } 
                    }
                    return obj;
                }

                d3.selectAll(".citation-link").remove();
                d3.selectAll(".citation").remove();

                var citationForce=d3.layout.force()
                        .nodes(citationData.nodes)
                        .links(citationData.edges)
                        .size([500,h])
                        // .linkDistance(50)
                        .charge(-100)
                        .gravity(.4)
                        .on("tick", tickCitations);

                var citationPath=citationEdges.selectAll(".citation-link")
                        .data(citationForce.links())
                
                citationPath.enter()
                    .append("line")
                    .attr("class", "citation-link")

                var citationNodes=citations.selectAll(".citation")
                        .data(citationForce.nodes())

                citationNodes.enter()
                    .append("g")
                    .attr("class", "citation")

                if($scope.citationForceStarted) {
                    citationForce.start();
                    // console.log(citationNodes.call(""));
                    citationNodes.call(citationForce.drag);
                } 


                drawCitations();
                
                var padding = 5, // separation between same-color circles
                    clusterPadding = 36, // separation between different-color circles
                    maxRadius = 20;

                function drawCitations(){

                    var citationExt=citationData.nodes.map(function(d){ return d.children.length }),
                        legendExt=d3.scale.linear().domain([0,3]).range(d3.extent(citationExt)),
                        citationSize=d3.scale.linear().domain(d3.extent(citationExt)).range([3,20]);

                    var a=[];
                    for(p in myProvinces) {
                        a.push(myProvinces[p].length);
                    }

                    var clutersColors=colorbrewer.Accent[4].reverse(),
                        citationProvinceClusteringColor=d3.scale.linear().domain(d3.extent(a)).range(clutersColors);

                    citationNodes.each(function (d, i) {
                            
                            var self = d3.select(this);
                            
                            self.append("circle")
                            .attr("r",function(d){ 
                                d.radius=citationSize(d.children.length);
                                return d.radius;
                            })
                            .style("fill", function(d){
                                if($scope.showCommunities) return citationColor(d.community)
                                else return citationProvinceClusteringColor(myProvinces[d.community].length)
                            })
                    })
                    /*
                    .on("click",function(d,i){

                        $scope.selection=true;
                        d.selected=true;
                        d.children.forEach(function(e){
                            e.selected=true;
                        })
                        var pieX=400+d3.selectAll(".pie-chart")[0].length*200;
                        // console.log(pieX);
                        var self=d3.select(this);
                        
                        self.append("text")
                          .attr("class", "legend")
                          .style("text-anchor", "middle")
                          .style("font-size", 11)
                          .style("fill","#404040")
                          // .attr("transform", "translate(0,"+(-width/2)+")")
                          .text(d.community)

                          console.log(myProvinces[d.community]);

                        drawCitationPie(
                            divCitations.append("g").attr("transform",'translate('+pieX+',200)'),
                            myProvinces[d.community],
                            d.community)
                    }) 
                    .on("mouseout",function(d,i){
                        $scope.selection=false;
                        d.selected=false;
                        d.children.forEach(function(e){
                            e.selected=false;
                        })
                        d3.select(".pie-chart").remove()
                    });
                    */
                    // legend
                    d3.select(".legend-communities").remove()

                    var legendCommunities=citationsLegend.append("g")
                        .attr("class","legend-communities")
                        .attr("transform","translate("+(400)+",0)")
                        .append("g")
                        .attr("class","legend-size")

                    // clustering
                    if(!$scope.showCommunities) {

                        var clusterLeg=d3.scale.linear().domain([0,clutersColors.length]).range(d3.extent(a))

                        legendCommunities
                            .append("text")
                            .style("fill","#404040")
                            .style("font-size", 10)
                            // .attr("height", 15)
                            .attr("dy", function(d,i) {return -40-(clutersColors.length+1)*15 })
                            .attr("dx", 55)
                            .text("Provinces clusters")

                        for (var j = 0; j < clutersColors.length+1; j++) {
                            legendCommunities
                                .append("rect")
                                .style("stroke","none")
                                .attr("width", 15)
                                .attr("height", 15)
                                .attr("y", function(d,i) {return -45-j*15 })
                                .attr("x", 60)
                                .attr("fill", citationProvinceClusteringColor(clusterLeg(j)))

                            legendCommunities
                                .append("text")
                                .style("fill","#ccc")
                                .style("font-size", 10)
                                // .attr("height", 15)
                                .attr("dy", function(d,i) {return -40-j*15 })
                                .attr("dx", 85)
                                .text(Math.round(clusterLeg(j))+" provinces")
                                // .attr("fill", citationProvinceClusteringColor(clusterLeg(j)))

                        }
                    }

                    // size
                    legendCommunities
                        .append("text")
                        .style("fill","#404040")
                        .style("font-size", 10)
                        // .attr("height", 15)
                        .attr("dy", function(d,i) {return -10 })
                        .attr("dx", 30)
                        .text("Interactions for each citations")

                    for (var i = 0; i < 3; i++) {
                        
                        var d=legendExt(i);
                        
                        legendCommunities
                            .append("circle")
                            .attr("r",citationSize(d) )
                            .attr("cy",citationSize(d))
                            .attr("cx", 50)
                            .style("fill","transparent")
                            .style("stroke","#ccc")

                        legendCommunities
                            .append("line")
                            .attr("x1", 50)
                            .attr("y1", citationSize(d)*2)
                            .attr("x2", 100)
                            .attr("y2", citationSize(d)*2)
                            .style("stroke","#ccc")
                            .style("stroke-width",.5);
                        
                        legendCommunities        
                            .append("text")
                            .attr("dx", 100)
                            .attr("dy", citationSize(d)*2)
                            .style("font-size",9)
                            .style("fill","#aaa")

                            .text((Math.round(d)+1)+" interactions")
                        
                    }
                    drawCitationPath()
                }

                function drawCitationPath() {
                    
                    citationPath.each(function (d, i) {
                        var self = d3.select(this);
                        self.style("stroke", function(d){return "#ccc"})
                            .style("stroke-width",2)
                    })
                }

                function tickCitations(e) {

                    var r=5,
                        w=citationForce.size()[0],
                        h=citationForce.size()[1];

                    citationPath.each(function (d,i) {
                        var self=d3.select(this);

                        var x1=Math.max(r, Math.min(w - r, d.source.x)),
                            y1=Math.max(r, Math.min(h - r, d.source.y)),
                            x2=Math.max(r, Math.min(w - r, d.target.x)),
                            y2=Math.max(r, Math.min(h - r, d.target.y));

                        self.attr("stroke-opacity",function(e){
                            if($scope.selection) {
                                if(!d.selected) return 0.2;
                                else return 1;
                            } else return 1;
                        })

                        if(!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
                            self.attr("x1", x1)
                                .attr("y1", y1)
                                .attr("x2", x2)
                                .attr("y2", y2)
                        }
                        
                    })
                        

                    citationNodes
                        // .each(cluster(12 * e.alpha * e.alpha))
                        .each(collide(.5))
                        .attr("transform", function(d) { 
                            
                            var r=5,
                                w=citationForce.size()[0],
                                h=citationForce.size()[1],
                                x=Math.max(r, Math.min(w - r, d.x)),
                                y=Math.max(r, Math.min(h - r, d.y));
                                // x=d.x,
                                // y=d.y;

                            return "translate(" + x + "," + y + ")"; 
                        }).attr("fill-opacity",function(d){
                            if($scope.selection) {
                                if(!d.selected) return 0.3;
                                else return 1;
                            } else return 1;
                        });
                }

                // Move d to be adjacent to the cluster node.
                function cluster(alpha) {
                  return function(d) {
                    var cluster = leaders[d.community];
                    // console.log(cluster);
                    if (cluster === d) return;
                    var x = d.x - cluster.x,
                        y = d.y - cluster.y,
                        l = Math.sqrt(x * x + y * y),
                        r = d.radius + cluster.radius;
                    if (l != r) {
                      l = (l - r) / l * alpha;
                      d.x -= x *= l;
                      d.y -= y *= l;
                      cluster.x += x;
                      cluster.y += y;
                    }
                  };
                }

                // Resolves collisions between d and all other circles. 
                function collide(alpha) {
                  var quadtree = d3.geom.quadtree(citationData.nodes);
                  return function(d) {
                    var r = d.radius + maxRadius + Math.max(padding, clusterPadding),
                        nx1 = d.x - r,
                        nx2 = d.x + r,
                        ny1 = d.y - r,
                        ny2 = d.y + r;
                    quadtree.visit(function(quad, x1, y1, x2, y2) {
                      if (quad.point && (quad.point !== d)) {
                        var x = d.x - quad.point.x,
                            y = d.y - quad.point.y,
                            l = Math.sqrt(x * x + y * y),
                            r = d.radius + quad.point.radius + (d.cluster === quad.point.cluster ? padding : clusterPadding);
                        if (l < r) {
                          l = (l - r) / l * alpha;
                          d.x -= x *= l;
                          d.y -= y *= l;
                          quad.point.x += x;
                          quad.point.y += y;
                        }
                      }
                      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                    });
                  };
                }

                function drawCitationPie(element, _data, _community) {

                    element.select(".pie-chart").remove()

                    // console.log($scope.geoColors);

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
                                            "color": "#ccc", 
                                            "value": others})
                    // console.log(data);
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
                      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
                
                    svg.on("click", function(d){
                        element.select(".pie-chart").remove()
                    })

                    var g = svg.selectAll(".arc")
                      .data(pie(data))
                      .enter()


                    g.append("path")
                      .attr("class", "arc")
                      .attr("d", arc)
                      .attr("data-legend", function(d){ return d.data.label })
                      .style("fill", function(d) { return d.data.color; });

                    g.append("text")
                      .attr("transform", function(d) { return "translate(" + arc.centroid(d) + ")"; })
                      .attr("dy", ".25em")
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
                      .text("Community "+_community)
                }

            })
        }
    }
})
