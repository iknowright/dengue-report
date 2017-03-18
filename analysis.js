$("#chart-weeklyDatePicker").datetimepicker({
  format: 'YYYY-MM-DD'
});

$("#chart-weeklyDatePicker").on("dp.change", function() {
  var value = $("#chart-weeklyDatePicker").val();
  var firstDate = moment(value, "YYYY-MM-DD").day(0).format("YYYY-MM-DD");
  var lastDate = moment(value, "YYYY-MM-DD").day(6).format("YYYY-MM-DD");
  $('#analysis-name').html('<h3 class="text-center">資料載入中...</h3>');
  $("#chart-weeklyDatePicker").val(firstDate + "~" + lastDate);
  updateTownForm();
});

$("#chart-select-country").change(function() {
  $('#analysis-name').html('<h3 class="text-center">資料載入中...</h3>');
  updateTownForm();
});

$("#chart-select-town").change(function() {
  $('#analysis-name').html('<h3 class="text-center">資料載入中...</h3>');
  window.fetchWeek($("#chart-weeklyDatePicker").val(), function() {
    appendChart('#chart', $("#chart-weeklyDatePicker").val());
    updateAnalysisTitle();
  });
});

function updateTownForm() {
  window.fetchWeek($("#chart-weeklyDatePicker").val(), function() {
    var week = $("#chart-weeklyDatePicker").val();
    var country = $("#chart-select-country").val();
    var townsHasData = window.getKeys(window.allWeekResult[week][country])
    if (townsHasData.length > 0) {
      $("#chart-select-town").empty();

      townsHasData.forEach(function(town) {
        var insertHTML = "<option value='{0}'>{0}</option>".format(town, town);
        $("#chart-select-town").append(insertHTML);
        $('#chart-select-town').trigger("change");
      });
    }
    if (townsHasData.length > 0 && townsHasData.length !== 1) {
      $("#chart-select-town").prepend("<option value='全區'>全區</option>");
      $("#chart-select-town").val('全區');
      $('#chart-select-town').trigger("change");
    } else if (townsHasData.length === 1) {
      appendChart('#chart', $("#chart-weeklyDatePicker").val());
    } else if (townsHasData.length === 0) {
      $("#chart-select-town").empty();
      var insertHTML = "<option value='{0}'>{1}</option>".format('無資料', '無資料');
      $("#chart-select-town").append(insertHTML);
    }
    updateAnalysisTitle();
  });
}

function updateAnalysisTitle() {
  var country = $("#chart-select-country").val();
  var town = $("#chart-select-town").val();
  var week = $("#chart-weeklyDatePicker").val();
  var analysisTitle;

  if (town === '無資料') {
    analysisTitle = '<h3 class="text-center">暫無資料</h3>';
    $('#chart').empty();
  } else {
    analysisTitle = '<h3 class="text-center">' + week + ' / ' + country + ' / ' + town + '</h3>';
  }

  $('#analysis-name').hide();
  $('#analysis-name').html(analysisTitle);
  $('#analysis-name').fadeIn('slow');
}

function appendChart(seletor, week) {
  console.log(allWeekResult);
  var country = $("#chart-select-country").val();
  var town = $("#chart-select-town").val();
  var data = [];
  if (town === '全區') {
    var towns = window.getKeys(window.allWeekResult[week][country]);
    towns.forEach(function(town) {
      var villages = window.getKeys(window.allWeekResult[week][country][town]);
      villages.forEach(function(village) {
        var bucketes = window.getKeys(window.allWeekResult[week][country][town][village]);
        var bucketNum = bucketes.length;
        var bucketesHasEgg = 0;
        var villageTotalEggNum = 0;
        bucketes.forEach(function(bucket) {
          var eggNum = window.allWeekResult[week][country][town][village][bucket].egg_num;
          if (eggNum > 0 && !isNaN(eggNum)) {
            bucketesHasEgg += 1;
            villageTotalEggNum += eggNum;
          }
        })
        if (villageTotalEggNum > 0) {
          data.push({
            'name': village,
            'rate': 100 * bucketesHasEgg / bucketNum,
            'eggNum': villageTotalEggNum
          })
        }
      })
    })
  } else {
    var villages = window.getKeys(window.allWeekResult[week][country][town]);
    villages.forEach(function(village) {
      var bucketes = window.getKeys(window.allWeekResult[week][country][town][village]);
      var bucketNum = bucketes.length;
      var bucketesHasEgg = 0;
      var villageTotalEggNum = 0;
      bucketes.forEach(function(bucket) {
        var eggNum = window.allWeekResult[week][country][town][village][bucket].egg_num;
        if (eggNum > 0 && !isNaN(eggNum)) {
          bucketesHasEgg += 1;
          villageTotalEggNum += eggNum;
        }
      })
      if (villageTotalEggNum > 0) {
        data.push({
          'name': village,
          'rate': 100 * (bucketesHasEgg / bucketNum).toFixed(4),
          'eggNum': villageTotalEggNum
        })
      }
    })
  }

  $(seletor).empty();
  if (data.length === 0) {

    $("#chart-select-town").empty();
    var insertHTML = "<option value='{0}'>{1}</option>".format('無資料', '無資料');
    $("#chart-select-town").append(insertHTML);
  } else {

    var margin = { top: 60, right: 80, bottom: 60, left: 80 },
      width = 1024 - margin.left - margin.right,
      height = 500 - margin.top - margin.bottom;

    var x = d3.scale.linear().range([0, width]);
    var y = d3.scale.linear().range([height, 0]);

    var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

    var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left");


    var tooltip = d3.select(seletor).append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    var svg = d3.select(seletor).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain([0, 100]);
    y.domain([0, d3.max(data, function(d) {
      return d.eggNum
    })]);

    var dots = svg.selectAll(".dot")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "dots-group")
      .style('opacity', '0.9')
      .on("mouseover", function(d) {
        tooltip.transition()
          .ease('sin')
          .duration(200)
          .style("opacity", 0.9)
          .style("display", "block");
        tooltip.html("陽性率:" + d.rate.toFixed(1) + "% 卵數:" + d.eggNum)
          .style("left", function() {
            return ((x(d.rate) + margin.left) > 850 ? 850 : (x(d.rate) + margin.left)) + "px"
          })
          .style("top", (y(d.eggNum) + margin.top - 50) + "px")
          .style("transform", "translateX(-50%)");

        d3.selectAll('.dots-group').style("opacity", 0.1);
        d3.select(this).style("opacity", 1);

      })
      .on("mouseout", function(d) {
        tooltip
          .transition()
          .ease('sin')
          .style("opacity", 0)
          .duration(200)
          .style("display", "none");

        d3.selectAll('.dots-group').style("opacity", '');
      });

    dots.append('circle')
      .attr("class", "dot")
      .attr("r", 5)
      .attr("cx", function(d) {
        return x(d.rate);
      })
      .attr("cy", function(d) {
        return y(d.eggNum);
      })

    dots.append('text')
      .attr("class", "dot-label")
      .attr("x", function(d) {
        return x(d.rate) - 53;
      })
      .attr("y", function(d) {
        return y(d.eggNum) + 5;
      })
      .text(function(d) {
        return d.name;
      })
      .style('font-size', '15px')
      .style("fill", function(d) {
        return 'dimgrey';
      });

    var xAxisGroup = svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis);

    xAxisGroup.append("text")
      .attr("class", "label")
      .attr("x", width)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("陽性率 (%)");

    var yAxisGroup = svg.append("g")
      .attr("class", "y axis")
      .call(yAxis);

    yAxisGroup.append("text")
      .attr("class", "label")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("卵數 (個)")
  }
}
