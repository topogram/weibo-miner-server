Topogram.directive('timeserie', function () {
    // var chart = d3.custom.timeSerie(),
    return {
        replace: false,
        scope: { 
            timeData: '=timeData',
            start: '=start',
            end: '=end',
            topogramName: "=topogramName"
         },
        link: function ($scope, element, attrs) {

            var margin = {top: 20, right: 20, bottom: 80, left: 40},
                        width = 900,
                        height = 250,
                        gap = 0,
                        ease = 'cubic-in-out',
                        bars;
            
            var duration = 500;

            var time_width = width - margin.left - margin.right,
                time_height = height - margin.top - margin.bottom;

            // Construct our SVG object.
            var svg = d3.select(element[0])
                .append("svg")
                .style("background","#fff")
                .attr("width", time_width + margin.left + margin.right)
                .attr("height", time_height + margin.top + margin.bottom)
                    .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            $scope.$watch('timeData', function(updatedTimeData, oldVal) {

                if(updatedTimeData != undefined && $scope.start!= undefined && $scope.end!= undefined) {

                    // console.log('draw timeline');

                    var _data=updatedTimeData;

                    // Scales.
                    var x = d3.time.scale().range([time_width/_data.length/2, time_width-time_width/_data.length/2]);
                    // var x = d3.scale.ordinal().rangeRoundBands([0, time_width], .05);
                    var y = d3.scale.linear().range([time_height, 0]);


                    // X-axis.
                    var xAxis = d3.svg.axis()
                        .scale(x)
                        .orient("bottom")
                        // .ticks(d3.time.month, 1)
                        .tickFormat(d3.time.format("%d %B"));

                    var yAxis = d3.svg.axis()
                        .scale(y)
                        .orient("left")
                        .ticks(10);

                    // Set scale domains. 
                    x.domain(d3.extent(_data, function(d) { return d.time; }));
                    y.domain([0, d3.max(_data, function(d) { return d.count; })]);
                    
                    svg.transition().duration(duration).attr({width: width, height: height})
                    
                    // Call x-axis. 
                    d3.select(".x.axis")
                        .transition()
                        .duration(duration)
                        .ease(ease)
                        .call(xAxis);

                    
                    // Draw bars. 
                    bars = svg.append("g")
                        .attr("class","timebar")
                        .selectAll(".timebar")
                        .data( _data, function(d) { return d.time; });

                    d3.select(".timebar")
                        .append("g")
                        .attr("transform","translate(50,10)")
                        .append("text")
                        .style("font-size",9)
                        .style("color", "#404040")
                        .text("Volume of tweets in topogram "+$scope.topogramName +" (year 2012)")

                    bars.transition()
                        .duration(duration)
                        .ease(ease)
                        .attr("x", function(d) { return x(d.time) - time_width/_data.length/2; })
                        .attr("width", time_width / _data.length)
                        .attr("y", function(d) { return y(d.count); })
                        .attr("height", function(d) { return time_height - y(d.count);});

                    bars.enter().append("rect")
                        .attr("class", "count")
                        .attr("width", time_width / _data.length)
                        .attr("x", function(d) { return x(d.time) - (time_width/_data.length)/2; })
                        .attr("y", time_height)
                        .attr("height", 0)
                        .style("fill", function(d){ return (d.selected)?"steelblue":"#CCC"})
                        .transition().duration(1000)
                        .attr("y", function(d) { return y(d.count); })
                        .attr("height", function(d) { return time_height - y(d.count);});

                    svg.append("g")
                        .attr("class", "x axis")
                        .attr("transform", "translate(0," + time_height + ")")
                        .call(xAxis)
                        .selectAll("text")
                            .attr("font-family", "sans-serif")
                            .attr("fill", "#4B4B4B")
                            .attr("font-size", 10)
                            .style("text-anchor", "end")
                            .attr("dx", "-.8em")
                            .attr("dy", ".15em")
                            .attr("transform", function(d) {
                                return "rotate(-65)" 
                                })
                            // .attr("transform", "rotate(-90)" );

                    svg.append("g")
                        .attr("class", "y axis")
                        .attr("transform", "translate(0,0)")
                        .call(yAxis)
                        .selectAll("text")
                            .attr("font-family", "sans-serif")
                            .attr("fill", "#4B4B4B")
                            .attr("font-size", 10)
                    
                    svg.select(".y")
                        .append("text") // caption
                            .attr("transform", "rotate(-90)")
                            .attr("y", 6)
                            .attr("dy", ".71em")
                            .style("text-anchor", "end")
                            .attr("text-anchor", "middle")  
                            .attr("font-family", "sans-serif")
                            .attr("fill", "#4B4B4B")
                            // .style("text-decoration", "bold")  
                            .attr("font-size", 10)
                            .text("Qty per day (tweets)")
                  
                    svg.selectAll(".domain")
                        .attr("fill", "none")
                        .attr("stroke", "#000")

                    bars.exit().transition().style({opacity: 0}).remove();

                    duration = 500;

                    function updateChart() {
                        // console.log($scope);
                      bars.data($scope.timeData)
                        .style("fill", function(d){ 
                            return (d.selected)?"steelblue":"#CCC"})
                    }

                    $scope.$watch('start', function(newStart, oldVal) {
                        if (newStart!=undefined) updateChart();
                        
                    })
                    $scope.$watch('end', function(newEnd, oldVal) {
                        if (newEnd!=undefined) updateChart();
                        
                    })
                    
                }
            })
        }
    }
});
