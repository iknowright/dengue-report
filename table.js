$("#table-weeklyDatePicker").datetimepicker({
  format: 'YYYY-MM-DD'
});

$("#table-weeklyDatePicker").on("dp.change", function() {
  var value = $("#table-weeklyDatePicker").val();
  var firstDate = moment(value, "YYYY-MM-DD").day(0).format("YYYY-MM-DD");
  var lastDate = moment(value, "YYYY-MM-DD").day(6).format("YYYY-MM-DD");

  $('#table-name').html('<h3 class="text-center">資料載入中...</h3>');
  $("#table-weeklyDatePicker").val(firstDate + "~" + lastDate);

  window.fetchWeek($("#table-weeklyDatePicker").val(), function() {
    updateTableTownFormAndTitle();
  });
});

$("#table-select-country").change(function() {
  $('#table-name').html('<h3 class="text-center">資料載入中...</h3>');

  window.fetchWeek($("#table-weeklyDatePicker").val(), function() {
    updateTableTownFormAndTitle();
  });
});

$("#table-select-town").change(function() {
  $('#table-name').html('<h3 class="text-center">資料載入中...</h3>');

  window.fetchWeek($("#table-weeklyDatePicker").val(), function() {
    appendTable('#table-content', $("#table-weeklyDatePicker").val());
    updateTableTitle();
  });
});

function updateTableTownFormAndTitle() {

  var week = $("#table-weeklyDatePicker").val();
  var country = $("#table-select-country").val();
  var townsHasData = window.getKeys(window.allWeekResult[week][country])
  if (townsHasData.length > 0) {
    $("#table-select-town").empty();

    townsHasData.forEach(function(town) {
      var insertHTML = "<option value='{0}'>{0}</option>".format(town, town);
      $("#table-select-town").append(insertHTML);
      $('#table-select-town').trigger("change");
    });
  }
  if (townsHasData.length > 0 && townsHasData.length !== 1) {
    $("#table-select-town").prepend("<option value='全區'>全區</option>");
    $("#table-select-town").val('全區');
    $('#table-select-town').trigger("change");
  } else if (townsHasData.length === 1) {
    appendTable('#table-content', $("#table-weeklyDatePicker").val());
  } else if (townsHasData.length === 0) {
    $("#table-select-town").empty();
    var insertHTML = "<option value='{0}'>{1}</option>".format('無資料', '無資料');
    $("#table-select-town").append(insertHTML);
  }
  updateTableTitle();
}

function updateTableTitle() {
  var country = $("#table-select-country").val();
  var town = $("#table-select-town").val();
  var week = $("#table-weeklyDatePicker").val();
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

function produceTableData(week) {
  var country = $("#table-select-country").val();
  var town = $("#table-select-town").val();
  var towns = [];
  var data = [];

  if (town === '全區') {
    towns = window.getKeys(window.allWeekResult[week][country]);
  } else {
    towns.push(town);
  }

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
        // eggNum: 每個里的bucket不一定只有10個，只算加起來的不公平，所以先乘10再除桶子數量
        data.push({
          'name': town + ' ' + village,
          'rate': 100 * (bucketesHasEgg / bucketNum).toFixed(4),
          'eggNum': (villageTotalEggNum * 10 / bucketes.length).toFixed(2)
        })
      }
    })
  })
  return data;
}

function appendTable(seletor, week) {

  var data = produceTableData(week);
  var formatData = new Array(9);
  var stringData = new Array(9);
  // formatData.forEach(function(d){ d = new Array(); });
  for(var i = 0; i < formatData.length ; i ++) formatData[i] = new Array();

  data.forEach(function(d){
    if(d.eggNum >= 500){

      if(d.rate >= 60){
        formatData[0].push(d);
      }else if(d.rate >= 30){
        formatData[1].push(d);
      }else{
        formatData[2].push(d);
      }

    } else if(d.eggNum >= 251){

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


  console.log(stringData);

  var tableHTML = '<table>' +
    '<tr height="40"><th>卵數（個）\\ 陽性率（ % ）</th><th>60% ~ 100%</th><th>30% ~ 59%</th><th>0% ~ 29%</th></tr>' +
    '<tr height="100"><th>500以上</th><td>{0}</td><td>{1}</td><td>{2}</td></tr>' +
    '<tr height="100"><th>251 ~ 499</th><td>{3}</td><td>{4}</td><td>{5}</td></tr>' +
    '<tr height="100"><th>0 ~ 250</th><td>{6}</td><td>{7}</td><td>{8}</td></tr>' +
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
