Topogram.directive('d3Cloud', function () {
        return {
          replace: false,
          scope: { 
              frequentWords: '=frequentWords'
           },
          link: function ($scope, element, attrs) {
                  
                  console.log("d3cloud");
                  var w=600,
                      h=300,
                      fill = d3.scale.category20(), 
                      fontScale=[10,140],
                      words, 
                      counts, 
                      cloudScaleFont;

                  // build SVG element
                  var svg = d3.select(element[0])
                          .append("svg")
                          // .style("background","#fff")
                          .attr("width", w)
                          .attr("height", h)
                          .append("g")
                          .attr("transform","translate("+(w/2)+","+(h/2)+")")

                  // watch data
                  $scope.$watch('frequentWords', function(frequentWords, oldVal) {
                    
                    if(frequentWords != oldVal && frequentWords != undefined) {
                    
                          // calculate scales
                          words = frequentWords.map(function(d){return d.word}),
                          counts=frequentWords.map(function(d){return d.count}),
                          cloudScaleFont=d3.scale.linear().domain(d3.extent(counts)).range(fontScale);

                          // select layout
                          d3.layout.cloud().size([w, h])
                                .words(frequentWords)
                                .padding(1)
                                .rotate(function() { return ~~(Math.random() * 2) * 90; })
                                .font("Impact")
                                .fontSize(function(d) { return cloudScaleFont(d.count); })
                                .on("end", draw)
                                .start();


                        function draw(_words) {
                          console.log(_words);
                          wordsElements = svg.selectAll("text")
                              .data(_words);

                          wordsElements.enter()
                            .append("text")
                              .style("font-size", function(d) { return d.size + "px"; })
                              .style("font-family", "Impact")
                              .style("fill", function(d, i) { return fill(i); })
                              .attr("text-anchor", "middle")
                              .attr("transform", function(d) {
                                return "translate(" + [d.x, d.y] + ")";
                              })
                              .text(function(d) { return d.word; });
                      }

                 }
          });
          }
    }
});
