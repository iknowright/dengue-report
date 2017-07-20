/*
$("#barAndLine-weeklyDatePicker").datetimepicker({
  format: 'YYYY-MM-DD'
});

$("#barAndLine-weeklyDatePicker").on("dp.change", function () {
  var value = $("#barAndLine-weeklyDatePicker").val();
  var firstDate = moment(value, "YYYY-MM-DD").day(0).format("YYYY-MM-DD");
  var lastDate = moment(value, "YYYY-MM-DD").day(6).format("YYYY-MM-DD");

  $('#barAndLine-name').html('<h3 class="text-center">資料載入中...</h3>');
  $("#barAndLine-weeklyDatePicker").val(firstDate + "~" + lastDate);

  window.fetchWeek($("#barAndLine-weeklyDatePicker").val(), function () {
    updatebarAndLineTownFormAndTitle();
  });
});

$("#barAndLine-select-country").change(function () {
  $('#barAndLine-name').html('<h3 class="text-center">資料載入中...</h3>');

  window.fetchWeek($("#barAndLine-weeklyDatePicker").val(), function () {
    updatebarAndLineTownFormAndTitle();
  });
});

$("#barAndLine-select-town").change(function () {
  $('#barAndLine-name').html('<h3 class="text-center">資料載入中...</h3>');

  window.fetchWeek($("#barAndLine-weeklyDatePicker").val(), function () {
    appendbarAndLine('#barAndLine-content', $("#barAndLine-weeklyDatePicker").val());
    updatebarAndLineTitle();
  });
});

function updatebarAndLineTownFormAndTitle() {

  var week = $("#barAndLine-weeklyDatePicker").val();
  var country = $("#barAndLine-select-country").val();
  var townsHasData = window.getKeys(window.allWeekResult[week][country])
  if (townsHasData.length > 0) {
    $("#barAndLine-select-town").empty();

    townsHasData.forEach(function (town) {
      var insertHTML = "<option value='{0}'>{0}</option>".format(town, town);
      $("#barAndLine-select-town").append(insertHTML);
      $('#barAndLine-select-town').trigger("change");
    });
  }
  if (townsHasData.length > 0 && townsHasData.length !== 1) {
    $("#barAndLine-select-town").prepend("<option value='全區'>全區</option>");
    $("#barAndLine-select-town").val('全區');
    $('#barAndLine-select-town').trigger("change");
  } else if (townsHasData.length === 1) {
    appendbarAndLine('#barAndLine-content', $("#barAndLine-weeklyDatePicker").val());
  } else if (townsHasData.length === 0) {
    $("#barAndLine-select-town").empty();
    var insertHTML = "<option value='{0}'>{1}</option>".format('無資料', '無資料');
    $("#barAndLine-select-town").append(insertHTML);
  }
  updatebarAndLineTitle();
}

function updatebarAndLineTitle() {
  var country = $("#barAndLine-select-country").val();
  var town = $("#barAndLine-select-town").val();
  var week = $("#barAndLine-weeklyDatePicker").val();
  var barAndLineTitle;

  if (town === '無資料') {
    barAndLineTitle = '<h3 class="text-center">暫無資料</h3>';
    $('#barAndLine-content').empty();
  } else {
    barAndLineTitle = '<h3 class="text-center">' + week + ' / ' + country + ' / ' + town + '</h3>';
  }

  $('#barAndLine-name').hide();
  $('#barAndLine-name').html(barAndLineTitle);
  $('#barAndLine-name').fadeIn('slow');
}
*/
$(window).on('load',function () {


  d3.json("result_2017.json", function (error, data) {

    for (var year in data){
      for (var city in data[year]){
        for (var village in data[year][city]){
          // title = year + '-' + city + '-' + town
          // if('summary' in )
            // appendPlot(data[year][city][village], title,svg, width)
          for (var town in data[year][city][village]) {
            title = year + '-' + city + '-' + village + '-' + town
            if ('summary' in data[year][city][village][town])
              appendPlot(data[year][city][village][town].summary, title)
          }
          
        }
        
      }
      
    }
  });
})

function appendPlot(data, title){

  var margin = {
    top: 70,
    right: 60,
    bottom: 70,
    left: 60
  },
    width = $('.container').width()*10/12 - 60 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;
  var svg = d3.select("#barAndLine-content").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
    "translate(" + margin.left + "," + margin.top + ")");

  var x = d3.scale.ordinal().rangeRoundBands([0, width], .05);

  var y = d3.scale.linear().range([height, 0]);
  var y2 = d3.scale.linear().range([height, 0]);

  var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")

  var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .ticks(6)

  var yAxis2 = d3.svg.axis()
    .scale(y2)
    .orient("right")
    .ticks(6)

  x.domain(data.map(function (d) {
    return d.weekNum;
  }));
  y.domain([0, d3.max(data, function (d) {
    return d.sumEggNum;
  })]);
  y2.domain([0, 100]);

  var line = d3.svg.line()
    .defined(function (d) { return d.positiveRate != -10; })
    .x(function (d) {
      return x(d.weekNum);
    })
    .y(function (d) {
      return y2(d.positiveRate);
    });


  svg.selectAll("bar")
    .data(data)
    .enter().append("rect")
    .style("fill", "blue")
    .attr("x", function (d) {
      return x(d.weekNum);
    })
    .attr("width", x.rangeBand())
    .attr("y", function (d) {
      return y(d.sumEggNum);
    })
    .attr("height", function (d) {
      return height - y(d.sumEggNum);
    });

  svg.append("path")
    .attr("class", "line")
    .attr("d", line(data))
    .attr("transform", "translate(" + x.rangeBand()/2 + ", 0)")
  
  svg.selectAll(".dot")
    .data(data.filter(function (d) { return d.positiveRate != -10; }))
    .enter().append("circle")
    .attr("class", "dot")
    .attr("cx", line.x())
    .attr("cy", line.y())
    .attr("r", 3.5)
    .attr("transform", "translate(" + x.rangeBand() / 2 + ", 0)")

  
  svg.append("text")
  .text(title)
    .attr("y",-50)
    .attr("x", width/2)
    .attr("text-anchor", "middle")

  svg.append("g")
    .attr("class", "y axis axis2")
    .attr("transform", "translate(" + width + ", 0)")
    .call(yAxis2)
    .append("text")
    .style("text-anchor", "end")
    .text("陽性率(%)")
    .attr("y", "-0.5em")
    .attr("transform", "rotate(-90)")
    .style("text-anchor", "end")

  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .append("text")
    .style("text-anchor", "end")
    .text("週數")
    .attr("x", width)
    .attr("dy", "3em")
    .selectAll("text")
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", "-.55em")
    .attr("transform", "rotate(-90)")

  svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("總卵數(個)");
}