$("#table-weeklyDatePicker").datetimepicker({
  format: 'YYYY-MM-DD'
});

$("#table-weeklyDatePickerStart").datetimepicker({
  format: 'YYYY-MM-DD'
});

$("#table-weeklyDatePickerEnd").datetimepicker({
  format: 'YYYY-MM-DD'
});

$("#table-weeklyDatePickerStart").on("dp.change", function(d) {
  var start = $("#table-weeklyDatePickerStart").val();
  var firstDate = moment(start, "YYYY-MM-DD").format("YYYY-MM-DD");
  var end = $("#table-weeklyDatePickerEnd").val();
  var lastDate = moment(end, "YYYY-MM-DD").format("YYYY-MM-DD");
  if(compareDate(firstDate,lastDate,start , end)) {
    $("#select-town").empty();  
    $("#select-town").append("<option value='{0}'>{0}</option>".format('全區'));
    $("#select-village").empty();
    $("#select-village").append("<option value='{0}'>{0}</option>".format('全里'));
    $('#table-name').html('<h3 class="text-center">資料載入中...</h3>');
    tableFetchWeek(firstDate,lastDate,$("#table-select-country").val(),$("#table-select-town").val(),$("#table-select-village").val());
  }
});
$("#table-weeklyDatePickerEnd").on("dp.change", function(d) {
  var start = $("#table-weeklyDatePickerStart").val();
  var firstDate = moment(start, "YYYY-MM-DD").format("YYYY-MM-DD");
  var end = $("#table-weeklyDatePickerEnd").val();
  var lastDate = moment(end, "YYYY-MM-DD").format("YYYY-MM-DD");
  if(compareDate(firstDate,lastDate, start, end)) {
    $("#table-select-town").empty();  
    $("#table-select-town").append("<option value='{0}'>{0}</option>".format('全區'));
    $("#table-select-village").empty();
    $("#table-select-village").append("<option value='{0}'>{0}</option>".format('全里'));
    $('#table-name').html('<h3 class="text-center">資料載入中...</h3>');
    tableFetchWeek(firstDate,lastDate,$("#table-select-country").val(),$("#table-select-town").val(),$("#table-select-village").val());
  }
});
$("#table-select-country").change(function() {
  var start = $("#table-weeklyDatePickerStart").val();
  var firstDate = moment(start, "YYYY-MM-DD").format("YYYY-MM-DD");
  var end = $("#table-weeklyDatePickerEnd").val();
  var lastDate = moment(end, "YYYY-MM-DD").format("YYYY-MM-DD");
  $("#table-select-town").empty();
  $("#table-select-town").append("<option value='{0}'>{0}</option>".format('全區'));
  $("#table-select-village").empty();
  $("#table-select-village").append("<option value='{0}'>{0}</option>".format('全里'));
  $('#table-name').html('<h3 class="text-center">資料載入中...</h3>');
  tableFetchWeek(firstDate,lastDate,$("#table-select-country").val(),$("#table-select-town").val(),$("#table-select-village").val());
});

$("#table-select-town").change(function() {
  var start = $("#table-weeklyDatePickerStart").val();
  var firstDate = moment(start, "YYYY-MM-DD").format("YYYY-MM-DD");
  var end = $("#table-weeklyDatePickerEnd").val();
  var lastDate = moment(end, "YYYY-MM-DD").format("YYYY-MM-DD");
  $("#table-select-village").empty();
  $("#table-select-village").append("<option value='{0}'>{0}</option>".format('全里'));
  $('#table-name').html('<h3 class="text-center">資料載入中...</h3>');
  tableFetchWeek(firstDate,lastDate,$("#table-select-country").val(),$("#table-select-town").val(),$("#table-select-village").val());
});

function tableFetchWeek(firstDate,lastDate,county,town) {
  // console.log(firstDate+lastDate+county+town);
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
  // console.log(params);
  $.getJSON(
    "http://54.91.186.134/api/bucket-record/",
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
      }
      tableUpdateTownForm(townresult, townTaken);
      // console.log("data length = "+ data.length);
      appendTable('#chart', data, townTaken, townresult);
      updateTableTitle();
    });
}

function tableUpdateTownForm(townresult, townTaken) {
  console.log(townresult);
  var week = $("#table-weeklyDatePicker").val();
  var county = $("#table-select-country").val();
  var insertHTML;

  if(townTaken == false){
    $("#select-town").empty();
    if (townresult.length === 0) {
      insertHTML = "<option value='{0}'>{0}</option>".format('無資料');
      $("#table-select-town").append(insertHTML);
    } else {
      $("#table-select-town").append("<option value='{0}'>{0}</option>".format('全區'));
      townresult.forEach(function(t) {
        var insertHTML = "<option value='{0}'>{0}</option>".format(t);
        $("#table-select-town").append(insertHTML);
      });
    }
  }
}

function produceTableData(data, townTaken, townresult) {
  var country = $("#table-select-country").val();
  var town = $("#table-select-town").val();
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
    // console.log(villageresult);
    villageresult.forEach(function(villageid) {
      var villagelist = data.filter(function(t) {
        return t.village == villageid;
      })
      
      
      var bucketNum = villagelist.length;
      console.log(bucketNum);
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
    // console.log(townresult);
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
      // console.log(villageresult);
      villageresult.forEach(function(villageid) {
        var villagelist = data.filter(function(t) {
          return t.village == villageid;
        })
        // console.log(villagelist);
        var bucketNum = villagelist.length;
        console.log(bucketNum);
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
  // console.log(returnData);
  return returnData;
}

function updateTableTitle() {
  var country = $("#table-select-country").val();
  var town = $("#table-select-town").val();
  var week = $("#table-weeklyDatePickerStart").val()+"~"+$("#table-weeklyDatePickerEnd").val();
  var tableTitle;

  if (town === '無資料') {
    tableTitle = '<h3 class="text-center">暫無資料</h3>';
    $('#table-content').empty();
  } else {
    tableTitle = '<h3 class="text-center">' + week + ' / ' + country + ' / ' + town + '</h3>';
  }

  $('#table-name').hide();
  $('#table-name').html(tableTitle);
  $('#table-name').fadeIn('slow');
}


function appendTable(seletor, data, townTaken, townresult) {

  var data = produceTableData(data, townTaken, townresult);
  var formatData = new Array(9);
  var stringData = new Array(9);
  var dataInterval = [500, 250, 0]
  for(var i = 0; i < formatData.length ; i ++) formatData[i] = new Array();

  data.forEach(function(d){
    if(d.eggNum >= dataInterval[0]){

      if(d.rate >= 60){
        formatData[0].push(d);
      }else if(d.rate >= 30){
        formatData[1].push(d);
      }else{
        formatData[2].push(d);
      }

    } else if(d.eggNum >= dataInterval[1]){

      if(d.rate >= 60){
        formatData[3].push(d);
      }else if(d.rate >= 30){
        formatData[4].push(d);
      }else{
        formatData[5].push(d);
      }

    } else {

      if(d.rate >= 60){
        formatData[6].push(d);
      }else if(d.rate >= 30){
        formatData[7].push(d);
      }else{
        formatData[8].push(d);
      }

    }
  })

  for(var i = 0; i < formatData.length ; i ++) {
    var length = formatData[i].length;
    var numOfDataToDisplay = 4;

    stringData[i] = formatData[i].map(function(d, index){
      if(index <= (numOfDataToDisplay-1)){
        return '<li>' + d.name + '<br><div class="inf">陽性率: ' + d.rate.toFixed(2) + '/ 卵數: ' + d.eggNum + '</div></li>';
      } else {
        return '<li class="read-more-target">' + d.name + '<br><div class="inf">陽性率: ' + d.rate.toFixed(2) + '/ 卵數: ' + d.eggNum + '</div></li>';
      }
    })
    if(stringData[i]){

      var showMoreText = '顯示其餘 ' + (length - numOfDataToDisplay) + ' 筆資料';
      if(length > numOfDataToDisplay){
        stringData[i] = stringData[i].reduce(
          function(prev, next){
            return prev + next;
          },'<ul class="read-more-wrap">');
        stringData[i] += '</ul>';
        stringData[i] = '<input type="checkbox" class="read-more-state" id="post-' + i + '" />' + stringData[i];
        stringData[i] = stringData[i] + '<label for="post-' + i + '" class="read-more-trigger" data-txt="' + showMoreText + '"></label>';
      } else {
        stringData[i] = stringData[i].reduce(
          function(prev, next){
            return prev + next;
          },'<ul>');
        stringData[i] += '</ul>';
      }

    }


  }


  var tableHTML = '<table>' +
    '<tr height="40"><th>卵數（個）\\ 陽性率（ % ）</th><th>60% ~ 100%</th><th>30% ~ 59%</th><th>0% ~ 29%</th></tr>' +
    '<tr height="100"><th>' + (dataInterval[0]) + '以上</th><td>{0}</td><td>{1}</td><td>{2}</td></tr>' +
    '<tr height="100"><th>' + (dataInterval[1]) + '~' + (dataInterval[0] - 1) + '</th><td>{3}</td><td>{4}</td><td>{5}</td></tr>' +
    '<tr height="100"><th>' + (dataInterval[2]) + '~' + (dataInterval[1] - 1) + '</th><td>{6}</td><td>{7}</td><td>{8}</td></tr>' +
    '</table>';

  for(var i = 0; i < 9 ; i++){
    if(stringData[i] !== ''){
      tableHTML = tableHTML.replace('{' + i + '}', stringData[i]);
    }
  }

  $(seletor).empty();
  if (data.length === 0) {
    $("#table-select-town").empty();
    var insertHTML = "<option value='{0}'>{1}</option>".format('無資料', '無資料');
    $("#table-select-town").append(insertHTML);
  } else {

    $('#table-content').html(tableHTML);
  }
}
