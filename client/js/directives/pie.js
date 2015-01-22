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
