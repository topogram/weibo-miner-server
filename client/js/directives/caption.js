// draw legend
$scope.$watch('topogram.es_query', function(newVal, oldVal) {

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
