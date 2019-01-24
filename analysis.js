var chartStartDate = "";
var chartEndDate = "";

$("#chart-weeklyDatePickerStart").datetimepicker({
  minDate: "2017/1/1",
  maxDate: "2018/4/22",
  format: 'YYYY-MM-DD',
});
$("#chart-weeklyDatePickerStart").val(null);

$("#chart-weeklyDatePickerStart").on("dp.hide", function(d) {
  if(chartStartDate == "") {
    chartStartDate = $("#chart-weeklyDatePickerStart").val();
  } else if($("#chart-weeklyDatePickerStart").val() == chartStartDate) {
    return;
  }
  $("#chart").empty();
  $('#analysis-name').empty();
  var start = $("#chart-weeklyDatePickerStart").val();
  var firstDate = moment(start, "YYYY-MM-DD").format("YYYY-MM-DD");
  var aidDateMin = moment(start, "YYYY-MM-DD").add(7, 'days').format("YYYY-MM-DD");
  var aidDateMax = moment(start, "YYYY-MM-DD").add(30, 'days').format("YYYY-MM-DD");
  $("#chart-weeklyDatePickerEnd").datetimepicker({
    minDate: aidDateMin,
    maxDate: aidDateMax,
    format: 'YYYY-MM-DD',
  });
  $("#chart-weeklyDatePickerEnd").data("DateTimePicker").clear();
});

$("#chart-weeklyDatePickerEnd").on("dp.hide", function(d) {
  if(chartEndDate == "") {
    chartEndDate = $("#chart-weeklyDatePickerEnd").val();
  } else if($("#chart-weeklyDatePickerEnd").val() == chartEndDate) {
    return;
  }
  chartStartDate = "";
  chartEndDate = "";
  var start = $("#chart-weeklyDatePickerStart").val();
  var firstDate = moment(start, "YYYY-MM-DD").format("YYYY-MM-DD");
  var end = $("#chart-weeklyDatePickerEnd").val();
  console.log(end);
  var lastDate = moment(end, "YYYY-MM-DD").format("YYYY-MM-DD");
  $("#chart-select-town").empty();
  $("#chart-select-town").append("<option value='{0}'>{0}</option>".format('全區'));
  $("#chart-select-village").empty();
  $("#chart-select-village").append("<option value='{0}'>{0}</option>".format('全里'));
  $('#analysis-name').html('<h3 class="text-center">資料載入中...</h3>');
  chartFetchWeek(firstDate,lastDate,$("#select-country").val(),$("#chart-select-town").val(),$("#chart-select-village").val());
});

$("#chart-select-country").change(function() {
  var start = $("#chart-weeklyDatePickerStart").val();
  var firstDate = moment(start, "YYYY-MM-DD").format("YYYY-MM-DD");
  var end = $("#chart-weeklyDatePickerEnd").val();
  var lastDate = moment(end, "YYYY-MM-DD").format("YYYY-MM-DD");
  $("#chart-select-town").empty();
  $("#chart-select-town").append("<option value='{0}'>{0}</option>".format('全區'));
  $("#chart-select-village").empty();
  $("#chart-select-village").append("<option value='{0}'>{0}</option>".format('全里'));
  $('#analysis-name').html('<h3 class="text-center">資料載入中...</h3>');
  chartFetchWeek(firstDate,lastDate,$("#chart-select-country").val(),$("#chart-select-town").val(),$("#chart-select-village").val());
});

$("#chart-select-town").change(function() {
  var start = $("#chart-weeklyDatePickerStart").val();
  var firstDate = moment(start, "YYYY-MM-DD").format("YYYY-MM-DD");
  var end = $("#chart-weeklyDatePickerEnd").val();
  var lastDate = moment(end, "YYYY-MM-DD").format("YYYY-MM-DD");
  $("#chart-select-village").empty();
  $("#chart-select-village").append("<option value='{0}'>{0}</option>".format('全里'));
  $('#analysis-name').html('<h3 class="text-center">資料載入中...</h3>');
  chartFetchWeek(firstDate,lastDate,$("#chart-select-country").val(),$("#chart-select-town").val(),$("#chart-select-village").val());
});

function chartFetchWeek(firstDate,lastDate,county,town) {
  var params;
  var townTaken = false;
  if(town == '全區' || town == '無資料') {
    params = {
      start : firstDate,
      end : lastDate,
      county : county
    };
  }
  else {
    townTaken = true;
    params = {
      start : firstDate,
      end : lastDate,
      county : county,
      town : town
    };
  }
  $.getJSON(
    "http://54.91.186.134/api/bucket-record/",
    params,
    function(data) {
      var lookup = {};
      var towns;
      if(!townTaken) {
        townresult.length = 0;
        towns = data.map(function(d){ return d.town});
        townresult = $.unique(towns);
      }
      chartUpdateTownForm(townresult, townTaken);
      appendChart('#chart', data, townTaken, townresult);
      updateAnalysisTitle();
    });
}

function chartUpdateTownForm(townresult, townTaken) {
  var county = $("#chart-select-country").val();
  var insertHTML;

  if(townTaken == false){
    $("#chart-select-town").empty();
    if (townresult.length === 0) {
      insertHTML = "<option value='{0}'>{0}</option>".format('無資料');
      $("#chart-select-town").append(insertHTML);
    } else {
      $("#chart-select-town").append("<option value='{0}'>{0}</option>".format('全區'));
      townresult.forEach(function(t) {
        var insertHTML = "<option value='{0}'>{0}</option>".format(t);
        $("#chart-select-town").append(insertHTML);
      });
    }
  }
}

function updateAnalysisTitle() {
  var country = $("#chart-select-country").val();
  var town = $("#chart-select-town").val();
  var week = $("#chart-weeklyDatePickerStart").val()+"~"+$("#chart-weeklyDatePickerEnd").val();
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

function produceChartData(data, townTaken, townresult) {
  var country = $("#chart-select-country").val();
  var town = $("#chart-select-town").val();
  var bucketNum = data.length;
  var bucketHasEgg = 0;
  var eggSum = 0;
  var returnData = [];
  
  if(townTaken){
    var lookup = {};
    var items = data;
    var villageresult = [];
    // var result = [];
    for (var item, i = 0; item = items[i++];) {
      var village = item.village;
      if (!(village in lookup)) {
        lookup[village] = 1;
        villageresult.push(village);
      }
    }
    villageresult.forEach(function(villageid) {
      var villagelist = data.filter(function(t) {
        return t.village == villageid;
      })
      
      var bucketNum = villagelist.length;
      var bucketHasEgg = 0;
      var eggSum = 0;
      villagelist.forEach(function(element){   
        var eggNum = element.egg_count;
        if(eggNum > 0 && !isNaN(eggNum)) {
          bucketHasEgg++;
          eggSum += eggNum;
        }
      });
      if(eggSum > 0) {
        returnData.push({
          'name': town + ' ' + villageid,
          'rate': 100 * (bucketHasEgg / bucketNum).toFixed(4),
          'eggNum': (eggSum  / bucketNum * 10).toFixed(2)
        });
      }
    });
  } else {
    townresult.forEach(function(townid) {
      var townlist = data.filter(function(t) {
        return t.town == townid;
      })
      town = townid;
      var lookup = {};
      var items = townlist;
      var villageresult = [];
      // var result = [];
      for (var item, i = 0; item = items[i++];) {
        var village = item.village;
        if (!(village in lookup)) {
          lookup[village] = 1;
          villageresult.push(village);
        }
      }
      villageresult.forEach(function(villageid) {
        var villagelist = data.filter(function(t) {
          return t.village == villageid;
        })
        var bucketNum = villagelist.length;
        var bucketHasEgg = 0;
        var eggSum = 0;
        villagelist.forEach(function(element){   
          var eggNum = element.egg_count;
          if(eggNum > 0 && !isNaN(eggNum)) {
            bucketHasEgg++;
            eggSum += eggNum;
          }
        });
        if(eggSum > 0) {
          returnData.push({
            'name': town + ' ' + villageid,
            'rate': 100 * (bucketHasEgg / bucketNum).toFixed(4),
            'eggNum': (eggSum  / bucketNum * 10).toFixed(2)
          });
        }
      });
    });
  }
  
  return returnData;
}

function appendChart(seletor, data, townTaken, townresult) {
  var data = produceChartData(data, townTaken, townresult);
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
      return parseFloat(d.eggNum)
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
        return x(d.rate) + 10;
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