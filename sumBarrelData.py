#!/usr/bin/env python
# encoding: utf-8

import json
import datetime
import boto3

def dataformatInit(field, datasource):
    initResult = datasource = {'summary': []}
    return initResult

def SummerizeWeekDataAWS(filename, content):
    summaryData = {}
    json_data = json.loads(content)
    # get year
    print(filename)
    filename = filename.replace('~', '-')
    datesplit = filename.split('-')
    dataYear = datesplit[0]
    dateMonth = datesplit[1]
    dateDay = datesplit[2]
    weekNum = int(datetime.date(
        int(dataYear),
        int(dateMonth),
        int(dateDay)).strftime('%U'))
    print(weekNum)

    summaryData[dataYear] = {}
    # add county(Tainan, Kaoshuing, Pingtung)
    for county in json_data:
        countyDic = {'summary': {}}
        sumEggNumCounty = 0
        sumBucketNumCounty = 0
        positiveBucketNumCounty = 0
        effectiveBucketNumCounty = 0
        if county not in summaryData[dataYear]:
            summaryData[dataYear][county] = countyDic
        # add region
        for region in json_data[county]:
            regionDic = {'summary': {}}
            sumEggNumRegion = 0
            sumBucketNumRegion = 0
            positiveBucketNumRegion = 0
            effectiveBucketNumRegion = 0
            if region not in summaryData[dataYear][county]:
                summaryData[dataYear][county][region] = regionDic
            # add village
            for village in json_data[county][region]:
                villageDic = {'summary': {}}
                sumEggNum = 0
                sumBucketNum = len(json_data[county][region][village])
                positiveBucketNum = 0
                for bucket in json_data[county][region][village]:
                    if type(json_data[county][region][village][bucket]['egg_num']) == int:
                        sumEggNum += json_data[county][region][village][bucket]['egg_num']
                        if json_data[county][region][village][bucket]['egg_num'] > 0:
                            positiveBucketNum += 1
                    else :
                        sumBucketNum -= 1
                positiveRate = 0
                if sumBucketNum != 0:
                    avgEggNum = round(sumEggNum / sumBucketNum, 1)
                    positiveRate = round(positiveBucketNum / sumBucketNum, 1) * 100
                else:
                    positiveRate = -10
                villageDic['summary']['weekNum'] = weekNum
                villageDic['summary']['sumEggNum'] = sumEggNum
                villageDic['summary']['sumBucketNum'] = len(json_data[county][region][village])
                villageDic['summary']['effectiveBucketNum'] = sumBucketNum
                villageDic['summary']['positiveRate'] = positiveRate
                if village not in summaryData[dataYear][county][region]:
                    summaryData[dataYear][county][region][village]=villageDic
                # sum region info (1)
                sumEggNumRegion += sumEggNum
                effectiveBucketNumRegion += sumBucketNum
                sumBucketNumRegion += len(json_data[county][region][village])
                positiveBucketNumRegion += positiveBucketNum
            #sum region info
            regionDic['summary']['weekNum'] = weekNum
            regionDic['summary']['sumEggNum'] = sumEggNumRegion
            regionDic['summary']['sumBucketNum'] = sumBucketNumRegion
            regionDic['summary']['effectiveBucketNum'] = effectiveBucketNumRegion
            if effectiveBucketNumRegion!=0:
                regionDic['summary']['positiveRate'] = round(positiveBucketNumRegion / effectiveBucketNumRegion,1)*100
            else:
                regionDic['summary']['positiveRate'] = -10
            #sum county info
            sumEggNumCounty += sumEggNumRegion
            effectiveBucketNumCounty += effectiveBucketNumRegion
            sumBucketNumCounty += sumBucketNumRegion
            positiveBucketNumCounty += positiveBucketNumRegion
        countyDic['summary']['weekNum'] = weekNum
        countyDic['summary']['sumEggNum'] = sumEggNumCounty
        countyDic['summary']['sumBucketNum'] = sumBucketNumCounty
        countyDic['summary']['effectiveBucketNum'] = effectiveBucketNumCounty
        if effectiveBucketNumCounty != 0:
            countyDic['summary']['positiveRate'] = round(positiveBucketNumCounty / effectiveBucketNumCounty, 1)*100
            #print('Positive Rate: ' + str(countyDic['summary']['positiveRate']))
            #print('positiveBucketNumCounty ' + str(positiveBucketNumCounty))
            #print('effectiveBucketNumCounty ' + str(effectiveBucketNumCounty))
        else:
            countyDic['summary']['positiveRate'] = -10
    return summaryData


s3 = boto3.resource('s3')
bucket = s3.Bucket('dengue-report-dest')

resultData = {}
for obj in bucket.objects.filter(Prefix='week/'):
    if '.json' in obj.key and '2016' not in obj.key:
        key = obj.key.replace('week/', '')
        body = obj.get()['Body'].read().decode('utf-8')
        weeklyResult = SummerizeWeekDataAWS(key, body)
        for year in weeklyResult:
            if year not in resultData:
                resultData[year] = {}
            for county in weeklyResult[year]:
                if county not in resultData[year]:
                    resultData[year][county] = {'summary': []}
                else:
                    resultData[year][county]['summary'].append(weeklyResult[year][county]['summary'])
                for region in weeklyResult[year][county]:
                    if region != 'summary':
                        if region not in resultData[year][county]:
                            resultData[year][county][region] = {'summary': []}
                        else:
                            resultData[year][county][region]['summary'].append(weeklyResult[year][county][region]['summary'])
                    for village in weeklyResult[year][county][region]:
                        if village != 'summary' and region != 'summary':
                            if village not in resultData[year][county][region]:
                                resultData[year][county][region][village] = {'summary': []}
                            else:
                                resultData[year][county][region][village]['summary'].append(weeklyResult[year][county][region][village]['summary'])


s3.Object('dengue-report-dest', 'summary-data/summary_region_result.json').put(
        ACL='public-read',
        Body=json.dumps(resultData, ensure_ascii=False)
        )
