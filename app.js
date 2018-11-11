// string format
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] !== 'undefined' ? args[number] : match;
    })
  };
}
var townresult = [];
var villageresult = [];
var requestData = {};

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
  '高雄': [22.6397615, 120.2999183],
  '屏東': [22.667431, 120.486307]
}

$(document).ready(function() {
  $.getJSON("countryJson.json", function(data) {
    countryJson = data;
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

    heat = L.heatLayer([], {
      minOpacity: 0.4,
      radius: 40,
      blur: 20, //越小越精確、越大heat lose 越多
      gradient: {
        0.4: 'SlateBlue',
        0.6: 'Gold',
        1: 'red',
      }
    });
    $("#map").hide();

    var avgEggLegend = L.control({ position: 'bottomright' });
    var weekEggLegend = L.control({ position: 'bottomright' });
    var dangerDotLegend = L.control({ position: 'bottomright' });
    avgEggLegend.onAdd = function() {
      var div = L.DomUtil.create('div', 'info legend legend-heat');
      div.innerHTML += '<span class = "legend-header"><img src="images/heat.svg" width="18px" height="18px">&emsp;過去平均卵數（個）</img><hr>'
      div.innerHTML += '<i style="background:linear-gradient(to bottom, rgba(106,90,205,0.7) 0%,rgba(255,215,0,0.4) 50%,rgba(255,0,0,1) 100%);"></i>';
      div.innerHTML += '<div class="text-center">0<br>&#8768;<br>80 +</div>' //過去平均卵數legend 標示

      return div;
    };

    weekEggLegend.onAdd = function() {
      var div = L.DomUtil.create('div', 'info legend'),
        grades = [0, 1, 50, 100, 150, 200];

      div.innerHTML += '<span class = "legend-header"><img src="images/location.svg" width="18px" height="18px">&emsp;&emsp;&emsp;卵數（個）&emsp;&emsp;</img><hr>';
      for (var i = 0; i < grades.length; i++) {
        if (grades[i] === 0) {
          div.innerHTML +=  '<div class=" barrel_legend" id="grade_'+i +'">'+ '<input class="legendcheckbox" type="checkbox" checked="checked" value="grade_'+i +'"><i style="background:' + getIconStyleRGBA(grades[i]) + '"></i>'+ grades[i] + '<br></div>';
        } else {
          div.innerHTML += '<div class=" barrel_legend" id="grade_'+i +'">'+'<input class="legendcheckbox" type="checkbox" checked="checked" value="grade_'+i +'"><i style="background:' + getIconStyleRGBA(grades[i]) + '"></i>' + grades[i] + (grades[i + 1] ? ' &ndash; ' + (grades[i + 1] - 1) + '<br></div>' : ' <br></div>');
        }
      }

      div.innerHTML += '<div class=" barrel_legend" id="grade_other">'+ '<input class="legendcheckbox" type="checkbox" checked="checked" value="grade_'+i +'"><i style="background:#cccccc"></i>'  + '其他' + '<br></div>';

      return div;
    };

    dangerDotLegend.onAdd = function() {
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
      if ($(this).prop("checked")) {
        addDangerMarkers(dangerClusterLayer);
      } else {
        removeDangerMarkers(dangerClusterLayer);
      }
    })
    $(".barrel_legend > input").bind("click", function() {
      var selectedClass='.'+$(this).val()
      if ($(this).prop("checked")) {
        $(selectedClass).css('display','block')
      } else {
        $(selectedClass).css('display','none')
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
  var lastDate = moment(value, "YYYY-MM-DD").day(6).format("YYYY-MM-DD");
  $("#select-town").empty();
  $("#select-town").append("<option value='{0}'>{0}</option>".format('全區'));
  $("#select-village").empty();
  $("#select-village").append("<option value='{0}'>{0}</option>".format('全里'));
  $("#weeklyDatePicker").val(firstDate + "~" + lastDate);
  $('#map-name').html('<h3 class="text-center">資料載入中...</h3>');
  fetchWeek(firstDate,lastDate,$("#select-country").val(),$("#select-town").val(),$("#select-village").val());
});

// select event
$("#select-country").change(function() {
  var value = $("#weeklyDatePicker").val();
  var firstDate = moment(value, "YYYY-MM-DD").day(0).format("YYYY-MM-DD");
  var lastDate = moment(value, "YYYY-MM-DD").day(6).format("YYYY-MM-DD");
  $("#select-town").empty();
  $("#select-town").append("<option value='{0}'>{0}</option>".format('全區'));
  $("#select-village").empty();
  $("#select-village").append("<option value='{0}'>{0}</option>".format('全里'));
  $('#map-name').html('<h3 class="text-center">資料載入中...</h3>');
  fetchWeek(firstDate,lastDate,$("#select-country").val(),$("#select-town").val(),$("#select-village").val());
});

$("#select-town").change(function() {
  var value = $("#weeklyDatePicker").val();
  var firstDate = moment(value, "YYYY-MM-DD").day(0).format("YYYY-MM-DD");
  var lastDate = moment(value, "YYYY-MM-DD").day(6).format("YYYY-MM-DD");
  $("#select-village").empty();
  $("#select-village").append("<option value='{0}'>{0}</option>".format('全里'));
  // $('#map-name').html('<h3 class="text-center">資料載入中...</h3>');
  fetchWeek(firstDate,lastDate,$("#select-country").val(),$("#select-town").val(),$("#select-village").val());
});

$("#select-village").change(function() {
  var value = $("#weeklyDatePicker").val();
  var firstDate = moment(value, "YYYY-MM-DD").day(0).format("YYYY-MM-DD");
  var lastDate = moment(value, "YYYY-MM-DD").day(6).format("YYYY-MM-DD");
  // $('#map-name').html('<h3 class="text-center">資料載入中...</h3>');
  fetchWeek(firstDate,lastDate,$("#select-country").val(),$("#select-town").val(),$("#select-village").val());
});

function addDangerMarkers(layer) {
  dangerDots.forEach(function(item, id) {
    var lat = dangerDots[id].geometry.coordinates[1];
    var lng = dangerDots[id].geometry.coordinates[0];
    var type = dangerDots[id].properties.type;
    var district = dangerDots[id].properties.district;
    var villige = dangerDots[id].properties.villige;
    type = type ? type : '<em style="opacity:0.5">無資料</em>';

    var icon = L.icon({
      iconUrl: 'images/danger.svg',
      iconSize: [30, 30], // size of the icon
      popupAnchor: [0, -30],
      iconAnchor: [15, 30]
    });

    var marker = L.marker([lat, lng], { icon: icon }).bindPopup(
      ('<table>' +
        '<tr>' +
        '<th>地區</th>' +
        '<td>台南 {0} {1}</td>' +
        '</tr>' +
        '<tr>' +
        '<th>類型</th>' +
        '<td>{2}</td>' +
        '</tr>' +
        '</table>').format(district, villige, type));

    layer.addLayer(marker)
    dangerArray.push(marker);
  });
  map.addLayer(layer);
}

function removeDangerMarkers(layer) {
  dangerArray.forEach(function(marker) {
    layer.removeLayer(marker);
  });
}


// fetch '201x/xx/xx ~ 201x/xx/xx.json'
function fetchWeek(firstDate,lastDate,county,town,village) {
  console.log(firstDate+lastDate+county+town+village);
  var params;
  var townTaken = false;
  var villageTaken = false;
  if(town == '全區' || town == '無資料') {
    params = {
      start : firstDate,
      end : lastDate,
      county : county
    };
  }
  else {
    townTaken = true;
    if(village == '全里' || town == '無資料') {
      params = {
        start : firstDate,
        end : lastDate,
        county : county,
        town : town
      };
    }
    else {
      villageTaken = true;
      params = {
        start : firstDate,
        end : lastDate,
        county : county,
        town : town,
        village : village
      };
    }
  }
  console.log(params);
  $.getJSON(
    "http://52.23.181.212/api/bucket-record/",
    params,
    function(data) {
      // console.log(town);
      var lookup = {};
      var items = data;

      // var result = [];
      if(!townTaken) {
        townresult.length = 0;
        for (var item, i = 0; item = items[i++];) {
          var town = item.town;
          if (!(town in lookup)) {
            lookup[town] = 1;
            townresult.push(town);
          }
        }
        // console.log(townresult);
      } else {
        if(villageTaken == false){
          villageresult.length = 0;
          for (var item, i = 0; item = items[i++];) {
            var village = item.village;
            if (!(village in lookup)) {
              lookup[village] = 1;
              villageresult.push(village);
            }
          }
          // console.log(villageresult);
        }
      }
      updateTownAndVillageForm(townresult, villageresult, townTaken, villageTaken);
      console.log("data length = "+ data.length);
      insertBucketList(data);
      // updateMapTitle();
      // resetLegendCheckbox();
    });
}

function updateTownAndVillageForm(townresult, villageresult, townTaken, villageTaken) {
  console.log(townresult);
  console.log(villageresult);
  var week = $("#weeklyDatePicker").val();
  var county = $("#select-country").val();
  var insertHTML;

  if(townTaken == false){
    $("#select-town").empty();
    if (townresult.length === 0) {
      insertHTML = "<option value='{0}'>{0}</option>".format('無資料');
      $("#select-town").append(insertHTML);
      $("#select-village").empty();
      $("#select-village").append(insertHTML);
    } else {
      $("#select-village").empty();
      $("#select-town").append("<option value='{0}'>{0}</option>".format('全區'));
      $("#select-village").append("<option value='{0}'>{0}</option>".format('全里'));
      townresult.forEach(function(t) {
        var insertHTML = "<option value='{0}'>{0}</option>".format(t);
        $("#select-town").append(insertHTML);
      });
    }
  } else {
    if(villageTaken == false) {
      $("#select-village").empty();
      if (villageresult.length === 0) {
        insertHTML = "<option value='{0}'>{0}</option>".format('無資料');
        $("#select-village").append(insertHTML);
      } else {
        $("#select-village").append("<option value='{0}'>{0}</option>".format('全里'));
        villageresult.forEach(function(t) {
          var insertHTML = "<option value='{0}'>{0}</option>".format(t);
          $("#select-village").append(insertHTML);
        });
      }
    }
  }

}


function insertBucketList(data) {
  $("#bucket-list").empty();
  clearMap();
  console.log(data);

  var insertBucketJson = {};
  data.forEach(function(element) {
    var bucketAddress = "{0}{1}{2}".format(element.county, element.town, element.village);
    // console.log(bucketAddress); 
    insertBucketJson[element.bucket_id] = {
      egg_num: element.egg_count,
      village: element.village
    };
    insertBucketHtml(bucketAddress, element);    
  });      
  updateMap(insertBucketJson);
}

function insertBucketHtml(bucketAddress, bucketResult) {
  if(bucketResult.egypt_egg_count == -1) {
    bucketResult.egypt_egg_count = '暫無資料';
  }
  if(bucketResult.white_egg_count == -1) {
    bucketResult.white_egg_count = '暫無資料';
  }
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
      // '<p>過去一個月平均卵數：{9}</p>' +
      '</div>' +
      '</div>' +
      '</div>')
    .format(bucketResult.bucket_id, bucketAddress,
      bucketResult.egg_count, bucketResult.egypt_egg_count,
      bucketResult.white_egg_count, bucketResult.larvae_count,
      bucketResult.egypt_larvae_count, bucketResult.white_larvae_count,
    bucketResult.note/* , bucketResult.avg_egg_num */);
  $("#bucket-list").append(insertHTML);
}

function getKeys(obj) {
  try {
    var keys = Object.keys(obj);
    return keys;
  } catch (err) {
    return [];
  }
}

function updateMapTitle() {
  var country = $("#select-country").val();
  var town = $("#select-town").val();
  var village = $("#select-village").val();
  var week = $("#weeklyDatePicker").val();
  var mapTitle;

  if (town === '無資料' || village === '無資料') {
    mapTitle = '<h3 class="text-center">暫無資料</h3>';
  } else {
    mapTitle = '<h3 class="text-center">' + week + ' / ' + country + ' / ' + town + ' / ' + village + '</h3>';
  }

  $('#map-name').hide();
  $('#map-name').html(mapTitle);
  $('#map-name').fadeIn('slow');

}

function clearMap() {
  heat.remove();
  markerArray.forEach(function(marker) {
    map.removeLayer(marker);
  });

  heat = L.heatLayer([], {
    minOpacity: 0,
    radius: 40,
    blur: 20, //越小越精確、越大heat lose 越多
    gradient: {
      0: 'SlateBlue',
      0.5: 'Gold',
      1: 'red',
    }
  });

  $("#map").hide();
}

function updateMap(insertBucketJson) {

  if (JSON.stringify(insertBucketJson) === JSON.stringify({})) {
    $("#map").hide();
    return;
  }
  var bucketIds = Object.keys(insertBucketJson);
  bucketIds.forEach(function(bucketId) {
    var lat = bucketJson[bucketId].bucket_lat;
    var lng = bucketJson[bucketId].bucket_lng;
    var eggNem = insertBucketJson[bucketId].egg_num;
    var village = insertBucketJson[bucketId].village;
    var avgEggNum = insertBucketJson[bucketId].avg_egg_num;
    heat.addLatLng([lat, lng, avgEggNum/80]);

    var icon = L.icon({
      iconUrl: getIconStyle(eggNem),
      iconSize: [45, 80], // size of the icon
      popupAnchor: [0, -40],
      iconAnchor: [22, 60],
      className: getIconCat(eggNem),
    });
  
    var marker = L.marker([lat, lng], { icon: icon })
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
          '<tr>' +
          '<th>里</th>' +
          '<td>{2}</td>' +
          '</tr>' +
          '</table>').format(bucketId, eggNem, village))
      .addTo(map);
    markerArray.push(marker);
  });

  $("#map").show();
  heat.addTo(map);
  
}

function getIconStyle(amount) {
  var style;
  if (amount === 0) {
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
  } else {
    style = 'legend_undefined';
  }
  return 'images/' + style + '.svg';
}

function getIconCat(amount) {
  var category;
  if (amount === 0) {
    category = 'grade_0';
  } else if (amount > 0 && amount <= 49) {
    category = 'grade_1';
  } else if (amount >= 50 && amount <= 99) {
    category = 'grade_2';
  } else if (amount >= 100 && amount <= 149) {
    category = 'grade_3';
  } else if (amount >= 150 && amount <= 199) {
    category = 'grade_4';
  } else if (amount >= 200) {
    category = 'grade_5';
  } else {
    category = 'grade_other';
  }
  return category;
}

function getIconStyleRGBA(amount) {
  var style;
  if (amount === 0) {
    style = '#00FF9D';
  } else if (amount > 0 && amount <= 49) {
    style = '#33CC7E';
  } else if (amount >= 50 && amount <= 99) {
    style = '#66995E';
  } else if (amount >= 100 && amount <= 149) {
    style = '#99663F';
  } else if (amount >= 150 && amount <= 199) {
    style = '#CC331F';
  } else if (amount >= 200) {
    style = '#FF0000';
  }

  return style;
}

function resetLegendCheckbox(){
  $('.legendcheckbox').prop('checked',true);
}