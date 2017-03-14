// string format
if (!String.prototype.format) {
  String.prototype.format = function () {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function (match, number) {
      return typeof args[number] !== 'undefined'
        ? args[number]
        : match;
    })
  };
} 

var bucketJson = {};
var countryJson = {};
var dangerDots = [];
var allWeekResult = {};
var map;
var heat;
var markerArray = [];
var dangerArray = [];
var dangerClusterLayer;
var countryView = {
  '台南': [22.9971, 120.2126],
  '高雄': [22.6397615, 120.2999183]
}

$(document).ready(function() {
  $.getJSON("countryJson.json", function(data) {
    countryJson = data;

    var country = $("#select-country").val();
    var towns = Object.keys(countryJson[country]);
    towns.forEach(function(town) {
      var insertHTML = "<option value='{0}'>{0}</option>".format(town, town);
      $("#select-town").append(insertHTML);
    });
  });

  $.getJSON(
    "https://s3-ap-northeast-1.amazonaws.com/dengue-report-dest/bucket-list.json",
    function(data) {
      bucketJson = data;
  });

  $.getJSON("dangerJson.json", function(data) {
    dangerDots = data.features;

    dangerClusterLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50
    });
    map = L.map('map').setView(countryView[$("#select-country").val()], 14)
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 18,
      id: 'ching56.17hng6ja',
      accessToken: 'pk.eyJ1IjoiY2hpbmc1NiIsImEiOiJjaXNiZmYydGMwMTN1MnpwbnNqNWVqM2plIn0.k7h-PUGX7Tl5xLwDH3Qpsg'
    }).addTo(map);
    
    map.addLayer(dangerClusterLayer);
    addDangerMarkers(dangerClusterLayer);

    heat = L.heatLayer([],{
      minOpacity:0.4,
      radius: 40,
      blur:20,    //越小越精確、越大heat lose 越多
      gradient: {
        0.4: 'SlateBlue',
        0.6: 'Gold',
        1: 'red',
      }
    });
    $("#map").hide();

    var avgEggLegend = L.control({position: 'bottomright'});
    var weekEggLegend = L.control({position: 'bottomright'});
    var dangerDotLegend = L.control({position: 'bottomright'});
    avgEggLegend.onAdd = function () {
      var div = L.DomUtil.create('div', 'info legend legend-heat');
      div.innerHTML+='<span class = "legend-header"><img src="images/heat.svg" width="18px" height="18px">&emsp;過去平均卵數（個）</img><hr>'
      div.innerHTML += '<i style="background:linear-gradient(to bottom, rgba(106,90,205,0.7) 0%,rgba(255,215,0,0.4) 50%,rgba(255,0,0,1) 100%);"></i>';
      div.innerHTML += '<div class="text-center">0<br>&#8768;<br>80 +</div>'  //過去平均卵數legend 標示

      return div;
    };

    weekEggLegend.onAdd = function () {
      var div = L.DomUtil.create('div', 'info legend'),
          grades = [0, 1, 50, 100, 150, 200];

      div.innerHTML += '<span class = "legend-header"><img src="images/location.svg" width="18px" height="18px">&emsp;&emsp;&emsp;卵數（個）&emsp;&emsp;</img><hr>';
      for (var i = 0; i < grades.length; i++) {
        if(grades[i] === 0) {
          div.innerHTML += '<i style="background:' + getIconStyleRGBA(grades[i]) + '"></i>' + '<div class="text-center">'+ grades[i]+ '<br></div>';
        } else {
          div.innerHTML += '<i style="background:' + getIconStyleRGBA(grades[i]) + '"></i>' + '<div class="text-center">'+ grades[i] + (grades[i + 1] ? ' &ndash; ' + (grades[i + 1]-1) + '<br></div>' : ' +<br></div>');
        }
      }

      div.innerHTML += '<i style="background:#cccccc"></i>' + '<div class="text-center">' + '其他' + '<br></div>';

      return div;
    };

    dangerDotLegend.onAdd = function () {
    var div = L.DomUtil.create('div', 'info legend');
    $(div).css({
      width: '174px',
      textAlign: 'center',
    });

      div.innerHTML = '<label id="danger-marker-checkbox"><input type="checkbox" checked="checked"><img src="images/danger.svg">顯示列管點</label>'
      return div;
    };
    avgEggLegend.addTo(map);
    weekEggLegend.addTo(map);
    dangerDotLegend.addTo(map);

    $("#danger-marker-checkbox > input").bind("click", function() {
        if($(this).prop("checked")) {
          addDangerMarkers(dangerClusterLayer);
        } else {
          removeDangerMarkers(dangerClusterLayer);
        }
    })
  });
});

// date
$("#weeklyDatePicker").datetimepicker({
  format: 'YYYY-MM-DD'
});

$("#weeklyDatePicker").on("dp.change", function() {
  var value = $("#weeklyDatePicker").val();
  var firstDate = moment(value, "YYYY-MM-DD").day(0).format("YYYY-MM-DD");
  var lastDate =  moment(value, "YYYY-MM-DD").day(6).format("YYYY-MM-DD");
  $("#weeklyDatePicker").val(firstDate + "~" + lastDate);
  fetchWeek($("#weeklyDatePicker").val(), function() {
    insertBucketList($("#weeklyDatePicker").val());
  });
});

// select event
$("#select-country").change(function() {
  $("#select-town").empty();
  $("#select-town").append("<option value='全區'>全區</option>");

  var country = $(this).val();
  map.setView(countryView[country], 14);
  var towns = Object.keys(countryJson[country]);
  towns.forEach(function(town) {
    var insertHTML = "<option value='{0}'>{0}</option>".format(town, town);
    $("#select-town").append(insertHTML);
  });

  $("#select-village").empty();
  $("#select-village").append("<option value='全里'>全里</option>");

  fetchWeek($("#weeklyDatePicker").val(), function() {
    insertBucketList($("#weeklyDatePicker").val());
  });
});

$("#select-town").change(function() {
  $("#select-village").empty();
  $("#select-village").append("<option value='全里'>全里</option>");

  var country = $("#select-country").val();
  var town = $(this).val();
  if (town != '全區') {
    var villages = countryJson[country][town];
    villages.forEach(function(village) {
      var insertHTML = "<option value='{0}'>{0}</option>".format(village, village);
      $("#select-village").append(insertHTML);
    });
  }

  fetchWeek($("#weeklyDatePicker").val(), function() {
    insertBucketList($("#weeklyDatePicker").val());
  });
});

$("#select-village").change(function() {
  fetchWeek($("#weeklyDatePicker").val(), function() {
    insertBucketList($("#weeklyDatePicker").val());
  });
});

function addDangerMarkers(layer){
  dangerDots.forEach(function(item,id){
    var lat = dangerDots[id].geometry.coordinates[1];
    var lng = dangerDots[id].geometry.coordinates[0];
    var type = dangerDots[id].properties.type;

    if(type !== ''){
      var icon = L.icon({
        iconUrl: 'images/danger.svg',
        iconSize: [30,30], // size of the icon
        popupAnchor: [0,-30],
        iconAnchor:   [15, 30]
      });

      var marker = L.marker([lat, lng], {icon: icon}).bindPopup(
                      ('<table>' +
                        '<tr>' +
                          '<th>類型</th>' +
                          '<td>{0}</td>' +
                        '</tr>' +
                      '</table>').format(type));

      layer.addLayer(marker)
      dangerArray.push(marker);
    }
  });
  map.addLayer(layer);
}

function removeDangerMarkers(layer){
  dangerArray.forEach(function(marker) {
    layer.removeLayer(marker);
  });
}

// fetch '201x/xx/xx ~ 201x/xx/xx.json'
function fetchWeek(week, cb) {
  if(allWeekResult[week] !== undefined) {
    cb();
    return;
  }

  $.getJSON(
    "https://s3-ap-northeast-1.amazonaws.com/dengue-report-dest/week/{0}.json".format(week),
    function(data) {
      allWeekResult[week] = data;
      cb();
  })
  .fail(function() {
    allWeekResult[week] = {};
    cb();
  });
}

function insertBucketList(week) {
  $("#bucket-list").empty();
  clearMap();

  var country = $("#select-country").val();
  var town = $("#select-town").val();
  var village = $("#select-village").val();
  var towns = [];
  var insertBucketJson = {};
  if (village === '全里' && town === '全區') {
    towns = getKeys(allWeekResult[week][country]);
  } else if (village === '全里') {
    towns = [town];
  } else {
    var bucketIds = getKeys(allWeekResult[week][country][town][village]);
    bucketIds.forEach(function(bucketId) {
      var bucketAddress = "{0}{1}{2}".format(country, town, village);
      var bucketResult = allWeekResult[week][country][town][village][bucketId];
      insertBucketJson[bucketId] = {
        egg_num: allWeekResult[week][country][town][village][bucketId].egg_num,
        avg_egg_num: allWeekResult[week][country][town][village][bucketId].avg_egg_num
      };
      insertBucketHtml(bucketAddress, bucketResult);
    })
    isBucketNoData(insertBucketJson);
    updateMap(insertBucketJson);
    return ;
  }

  towns.forEach(function(town) {
    var villages = getKeys(allWeekResult[week][country][town]);
    villages.forEach(function(village) {
      var bucketIds = getKeys(allWeekResult[week][country][town][village]);
      bucketIds.forEach(function(bucketId) {
        var bucketAddress = "{0}{1}{2}".format(country, town, village);
        var bucketResult = allWeekResult[week][country][town][village][bucketId];
        insertBucketJson[bucketId] = {
          egg_num: allWeekResult[week][country][town][village][bucketId].egg_num,
          avg_egg_num: allWeekResult[week][country][town][village][bucketId].avg_egg_num
        };
        insertBucketHtml(bucketAddress, bucketResult);
      });
    });
  });
  isBucketNoData(insertBucketJson);
  updateMap(insertBucketJson);
}

function insertBucketHtml(bucketAddress, bucketResult) {
  var insertHTML = 
    ('<div class="col-md-3 col-xs-12">' +
      '<div class="panel panel-default">' +
        '<div class="panel-heading text-center">' +
          '<h3 class="panel-title">{0}</h3>' +
          '<span>{1}</span>' +
        '</div>' +
        '<div class="panel-body">' +
          '<p>卵數：{2}</p>' +
          '<p>埃及孵化卵數：{3}</p>' +
          '<p>白線孵化卵數：{4}</p>' +
          '<p>孑孓：{5}</p>' +
          '<p>埃及幼蟲：{6}</p>' +
          '<p>白線幼蟲：{7}</p>' +
          '<p>備註：{8}</p>' +
          '<p>過去一個月平均卵數：{9}</p>' +
        '</div>' +
      '</div>' +
    '</div>')
  .format(bucketResult.bucket_id, bucketAddress,
    bucketResult.egg_num, bucketResult.egypt_egg_num,
    bucketResult.white_egg_num, bucketResult.larvae_num,
    bucketResult.egypt_larvae_num, bucketResult.white_larvae_num,
    bucketResult.survey_note, bucketResult.avg_egg_num);
  $("#bucket-list").append(insertHTML);
}

function getKeys(obj) {
  try {
    var keys = Object.keys(obj);
    return keys;
  } catch(err) {
    return [];
  }
}

function isBucketNoData(insertBucketJson) {
  if(JSON.stringify(insertBucketJson) === JSON.stringify({})) {
    var insertHTML = "<h3 class='text-center'>暫無資料</h3>";
    $("#bucket-list").append(insertHTML);
  }
}

function clearMap() {
  heat.remove();
  markerArray.forEach(function(marker) {
    map.removeLayer(marker);
  });

  heat = L.heatLayer([],{
    minOpacity:0.4,
    radius: 40,
    blur:20,    //越小越精確、越大heat lose 越多
    gradient: {
      0.4: 'SlateBlue',
      0.6: 'Gold',
      1: 'red',
    }
  });

  $("#map").hide();
}

function updateMap(insertBucketJson) {

  if(JSON.stringify(insertBucketJson) === JSON.stringify({})) {
    $("#map").hide();
    return;
  }
  var bucketIds = Object.keys(insertBucketJson);
  bucketIds.forEach(function(bucketId) {
    var lat = bucketJson[bucketId].bucket_lat;
    var lng = bucketJson[bucketId].bucket_lng;
    var egg_num = insertBucketJson[bucketId].egg_num;
    var avg_egg_num = insertBucketJson[bucketId].avg_egg_num;
    heat.addLatLng([lat, lng, avg_egg_num]);

    var icon = L.icon({
      iconUrl: getIconStyle(egg_num),
      iconSize: [45,80], // size of the icon
      popupAnchor: [0,-40],
      iconAnchor:   [22, 60]
    });

    var marker = L.marker([lat, lng], {icon: icon})
                  .bindPopup(
                    ('<table>' +
                      '<tr>' +
                        '<th>id</th>' +
                        '<td>{0}</td>' +
                      '</tr>' +
                      '<tr>' +
                        '<th>卵數</th>' +
                        '<td>{1}</td>' +
                      '</tr>' +
                    '</table>').format(bucketId, egg_num))
                  .addTo(map);
    markerArray.push(marker);
  });

  $("#map").show();
  heat.addTo(map);
}

function getIconStyle(amount){
  var style;
  if(amount === 0){
    style = 'legend1';
  } else if (amount > 0 && amount <= 49) {
    style = 'legend2';
  } else if (amount >= 50 && amount <= 99) {
    style = 'legend3';
  } else if (amount >= 100 && amount <= 149) {
    style = 'legend4';
  } else if (amount >= 150 && amount <= 199) {
    style = 'legend5';
  } else if (amount >= 200) {
    style = 'legend6';
  }
  else{
    style = 'legend_undefined';
  }
  return 'images/'+style+'.svg';
}

function getIconStyleRGBA(amount){
  var style;
  if(amount === 0){
    style = '#00FF9D';
  }else if(amount > 0 && amount <= 49){
    style = '#33CC7E';
  }else if(amount >= 50 && amount <= 99){
    style = '#66995E';
  }else if(amount >= 100 && amount <= 149){
    style = '#99663F';
  }else if(amount >= 150 && amount <= 199){
    style = '#CC331F';
  }else if(amount >= 200){
    style = '#FF0000';
  }

  return style;
}
