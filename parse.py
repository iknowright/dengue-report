import boto3
import json
import re

from datetime import datetime, timedelta
from pprint import pprint
from openpyxl import load_workbook

s3 = boto3.resource('s3')
s3_client = boto3.client('s3')
file_list = list()
for key in s3.Bucket('dengue-report-source').objects.all():
    if key.key.endswith(".xlsx"):
        if len(key.key.split("/")) != 2:
            continue
        city = key.key.split("/")[0]
        file_name = key.key.split("/")[1]
        file_list.append({
            "city": city,
            "file_name": file_name,
            "file_key": key.key
        })

bucket_dict = dict()
survey_dict = dict()
for file_dict in file_list:
    s3_client.download_file(
        'dengue-report-source',
        file_dict['file_key'],
        file_dict['file_name']
    )

    wb = load_workbook(file_dict['file_name'])
    print (file_dict['file_name'])
    city = file_dict['city']
    for sheet_name in wb.get_sheet_names():
        sheet_name_match1 = re.search(r'\d+年第\d+週', sheet_name)
        sheet_name_match2 = re.search(r'\d+第\d+週', sheet_name)
        if sheet_name == '誘卵桶資訊':
            ws = wb['誘卵桶資訊']
            for row in range(3, ws.max_row+1):
                bucket_id = ws['A' + str(row)].value
                if bucket_id == None:
                    continue

                bucket_x = ws['B' + str(row)].value
                bucket_y = ws['C' + str(row)].value
                bucket_address = ws['D' + str(row)].value
                bucket_note = ws['E' + str(row)].value
                bucket_dict[bucket_id] = {
                    'bucket_x': bucket_x,
                    'bucket_y': bucket_y,
                    'bucket_address': bucket_address,
                    'bucket_note': bucket_note
                }
        elif sheet_name_match1 or sheet_name_match2:
            ws = wb[sheet_name]
            print (sheet_name)
            for row in range(3, ws.max_row+1):
                survey_date = ws['A' + str(row)].value
                bucket_id = ws['B'+ str(row)].value
                if isinstance(survey_date, datetime) == False or \
                        bucket_dict.get(bucket_id) == None:
                    break

                area = ws['C' + str(row)].value
                village = ws['D' + str(row)].value
                egg_num = ws['E' + str(row)].value
                egypt_egg_num = ws['F' + str(row)].value
                white_egg_num = ws['G'+ str(row)].value
                larvae_num = ws['H' + str(row)].value
                egypt_larvae_num = ws['I' + str(row)].value
                white_larvae_num = ws['J' + str(row)].value
                survey_note = ws['K' + str(row)].value

                week_start = survey_date - timedelta(days=survey_date.weekday()+1)
                week_end = week_start + timedelta(days=6)
                week_range_str = '%s %s' % (
                    week_start.strftime("%Y-%m-%d"), week_end.strftime("%Y-%m-%d"))

                if survey_dict.get(week_range_str) == None:
                    survey_dict[week_range_str] = dict()
                    survey_dict[week_range_str][city] = dict()
                    survey_dict[week_range_str][city][area] = dict()
                    survey_dict[week_range_str][city][area][village] = dict()
                elif survey_dict[week_range_str].get(city) == None:
                    survey_dict[week_range_str][city] = dict()
                    survey_dict[week_range_str][city][area] = dict()
                    survey_dict[week_range_str][city][area][village] = dict()
                elif survey_dict[week_range_str][city].get(area) == None:
                    survey_dict[week_range_str][city][area] = dict()
                    survey_dict[week_range_str][city][area][village] = dict()
                elif survey_dict[week_range_str][city][area].get(village) == None:
                    survey_dict[week_range_str][city][area][village] = dict()

                survey_dict[week_range_str][city][area][village][bucket_id] = {
                    "bucket_id": bucket_id,
                    "bucket_x": bucket_dict[bucket_id]["bucket_x"],
                    "bucket_y": bucket_dict[bucket_id]["bucket_y"],
                    "survey_date": survey_date.strftime("%Y-%m-%d"),
                    "egg_num": egg_num,
                    "egypt_egg_num": egypt_egg_num,
                    "white_egg_num": white_egg_num,
                    "larvae_num": larvae_num,
                    "egypt_larvae_num": egypt_larvae_num,
                    "white_larvae_num": white_larvae_num,
                    "survey_note": survey_note,
                }

for week_range_str in survey_dict.keys():
    s3.Object("dengue-report-dest", "week/%s.json" % (week_range_str)).put(
        ACL='public-read',
        Body=json.dumps(survey_dict[week_range_str], ensure_ascii=False)
    )
    break
    # with open('%s.json' % (week_range_str), 'w') as myfile:
        # json.dump(
            # survey_dict[week_range_str],
            # myfile,
            # indent=4,
            # ensure_ascii=False
        # )
