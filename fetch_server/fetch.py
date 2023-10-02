import pandas as pd
import geopandas as gpd
import pandas as pd
from shapely.geometry import Point
from datetime import date
from geojson import Point, Feature, FeatureCollection, dump
import requests
import json
import math 
import sys
import merge
import numpy
import os

f = open('./last_fetch_date.txt', 'w+')
last_fetch_time = f.read()
# last_fetch_time = "'2023-02-01T12:00:00.000'"

def get_data(url):
    api = requests.get(url)
    print('Complete Fetch', url, " ", api.status_code)
    data = api.text
    js = json.loads(data)
    return pd.DataFrame.from_dict(js)

#fetch data 
FSR = get_data("https://data.cityofnewyork.us/resource/mu46-p9is.json?$where=createddate>" + last_fetch_time + "&$limit=1000")
FI = get_data("https://data.cityofnewyork.us/resource/4pt5-3vv4.json?$where=createddate>" + last_fetch_time + "&$limit=1000")
FWO = get_data("https://data.cityofnewyork.us/resource/bdjm-n7q4.json?$where=createddate>"+ last_fetch_time + "&$limit=1000")
FRA = get_data("https://data.cityofnewyork.us/resource/259a-b6s7.json?$where=createddate>" + last_fetch_time + "&$limit=1000")

#Only keep subset of data
FSR_columns = ['srcategory', 'srtype', 'srpriority',
       'srsource', 'srstatus', 'srresolution', 'boroughcode',
       'servicerequestparentglobalid', 'globalid',
       'initiateddate', 'closeddate', 'createddate', 'updateddate',
       'descriptor1', 'complainttype', 'callerzipcode', 'srcallertype',
       'latitude', 'longitude', 'nta', 'communityboard', 'zipcode', 'census_tract']

FI_columns = ['inspectiontype', 'inspectionstatus',
       'inspectiontpcondition', 'inspectiontpstructure', 'treepointdbh',
       'globalid', 'servicerequestglobalid', 'inspectiondate', 'closeddate', 'createddate',
       'updateddate', 'parentinspectionglobalid', 'reinspectiondate', 'location']

FWO_columns = ['wotype', 'wostatus', 'wopriority', 'boroughcode',
       'inspectionglobalid', 'globalid', 'closeddate',
       'canceldate', 'cancelreason', 'createddate', 'updateddate', 'woentity',
       'woproject', 'wocategory', 'projstartdate', 'recommendedspecies', 'location']

FRA_columns = ['objectid', 'radefect', 'radefectlocation', 'failure', 'impacttarget',
       'consequence', 'riskrating', 'inspectionglobalid', 'globalid',
       'createddate', 'failureimpact', 'workorderglobalid']

## Deal with empty returns
# If there's no new service requests, stop the processing
if (len(FSR) == 0):
    sys.exit("Exiting the job as there's no new service requests")
if (len(FI) == 0):
    FI = pd.DataFrame(columns=FI_columns)
if (len(FWO) == 0):
    FWO = pd.DataFrame(columns=FWO_columns)
if (len(FRA) == 0):
    FRA = pd.DataFrame(columns=FRA_columns)

# insert columns if not exits
# FSR = FSR.reindex(columns=FSR_columns).fillna(0)
# FI = FI.reindex(columns=FI_columns).fillna(0)
# FWO = FI.reindex(columns=FWO_columns).fillna(0)
# FRA = FRA.reindex(columns=FRA_columns).fillna(0)

## Select subset due to memory limit
FSR = FSR[FSR_columns]
FI = FI[FI_columns]
FWO = FWO[FWO_columns]
FRA = FRA[FRA_columns]

# incident global ID (deal with parent requests)
FSR.loc[:, "GLOBAL_ID"] = FSR.apply(lambda x:  x.globalid if x.servicerequestparentglobalid!=x.servicerequestparentglobalid else x.servicerequestparentglobalid, axis = 1)
FSR['longitude'] = FSR['longitude'].astype(float)
FSR['latitude'] = FSR['latitude'].astype(float)

#requests that have no geo-info
FSR.longitude.isna().sum(), FSR.latitude.isna().sum() 

# find census tract
# not further process inspection dataset because only one inspection is needed for under-reporting measuring, but more inspections could still be used for other purposes
geometry = [None if math.isnan(xy[0]) or math.isnan(xy[1]) else Point(xy) for xy in zip(FSR.longitude, FSR.latitude)]
gdf = gpd.GeoDataFrame(FSR, crs=4326, geometry=geometry)

FSR.rename(columns={'globalid': 'SRGlobalID', 'closeddate': 'SRClosedDate', 'createddate': 'SRCreatedDate', 'updateddate': 'SRUpdatedDate'}, inplace=True)
FI.rename(columns={'globalid': 'InsGlobalID', 'closeddate': 'InsClosedDate', 'createddate': 'InsCreatedDate', 'updateddate': 'InsUpdatedDate', 'servicerequestglobalid': 'SRGlobalID'}, inplace=True)
FWO.rename(columns={'globalid': 'WOGlobalID', 'closeddate': 'WOClosedDate', 'createddate': 'WOCreatedDate', 'updateddate': 'WOUpdatedDate', 'inspectionglobalid': 'InsGlobalID'}, inplace=True)
FRA.rename(columns={'globalid': 'RAGlobalID', 'closeddate': 'RAClosedDate', 'createddate': 'RACreatedDate', 'inspectionglobalid': 'InsGlobalID'}, inplace=True)

## Merge Inspection Table
FI = FI[FI['location'].notna()]
FI["longitude"] = FI.location.copy().apply(lambda x: float(x['coordinates'][0])).copy()
FI["latitude"] = FI.location.copy().apply(lambda x: float(x['coordinates'][1])).copy()
geometry = [None if math.isnan(xy[0]) or math.isnan(xy[1]) else Point(xy) for xy in zip(FI.longitude, FI.latitude)]
g_FI = gpd.GeoDataFrame(FI, crs=4326, geometry=geometry)
# back to regular df
merge_FI = pd.DataFrame(g_FI)
# merge service requests w/ inspections
mergeddf = pd.merge(FSR, merge_FI, on='SRGlobalID', how='left', suffixes=('_SR', '_I'), left_index=False, right_index=False)
mergeddf['InsGlobalID'].fillna('0', inplace=True)

## Merge Work Orders
FWO["longitude"] = FWO.location.copy().apply(lambda x: float(x['coordinates'][0])).copy()
FWO["latitude"] = FWO.location.copy().apply(lambda x: float(x['coordinates'][1])).copy()

geometry = [None if math.isnan(xy[0]) or math.isnan(xy[1]) else Point(xy) for xy in zip(FWO.longitude, FWO.latitude)]
g_FWO = gpd.GeoDataFrame(FWO, crs=4326, geometry=geometry)

# back to regular df
merge_FWO = pd.DataFrame(g_FWO)
# merge SRs+Insps w/ WOs
mergeddf = pd.merge(mergeddf, merge_FWO, on='InsGlobalID', how='left', suffixes=('', '_WO'))

## Merge Risk Assessments
# merge SRs + Insps + WOs w/ Risk Assessmts
mergeddf = pd.merge(mergeddf, FRA, on='InsGlobalID', how='left', suffixes=('', '_RA'))

## Export to Json
def df_to_geojson(df, properties, lat='latitude', lon='longitude'):
    # create a new python dict to contain our geojson data, using geojson format
    geojson = {'features':[], 'type':'FeatureCollection'}

    # loop through each row in the dataframe and convert each row to geojson format
    for _, row in df.iterrows():
        # create a feature template to fill in
        feature = {'type':'Feature',
                   'properties':{},
                   'geometry':{'coordinates':[],
                               'type': 'Point'}
                  }

        # fill in the coordinates
        feature['geometry']['coordinates'] = [row[lon],row[lat]]

        # for each column, get the value and add it as a new feature property
        for prop in properties:
            feature['properties'][prop] = row[prop]
        
        # add this feature (aka, converted dataframe row) to the list of features inside our dict
        geojson['features'].append(feature)
    
    return geojson

## Only export partial data as geojson
cols_to_keep = ['srcategory', 'complainttype', 'srtype', 'descriptor1', 'srpriority', 'srstatus', 'srresolution', 
        'initiateddate', 'SRClosedDate', 'SRCreatedDate', 'SRUpdatedDate',
        'inspectiontype', 'inspectionstatus', 'inspectiontpcondition', 'inspectiontpstructure', 
        'inspectiondate', 'InsCreatedDate', 'InsUpdatedDate',  'InsClosedDate', 'reinspectiondate', 'parentinspectionglobalid',
        'wotype', 'wostatus', 'wocategory', 'woentity', 'woproject', 'wopriority',
        'WOCreatedDate', 'WOUpdatedDate',  'WOClosedDate', 'cancelreason', 'canceldate', 'projstartdate',
        'radefect', 'radefectlocation', 'failure', 'failureimpact', 'impacttarget', 'consequence', 'riskrating', 
        'RACreatedDate', 'nta', 'boroughcode', 'communityboard', 'zipcode', 'census_tract', 'latitude_SR', 'longitude_SR', 'geometry_SR']

mergeddf = mergeddf[cols_to_keep]


#drop rows is there's no geometry info
mergeddf = mergeddf[mergeddf['latitude_SR'].notna()]
mergeddf['complainttype'].fillna('None Selected', inplace=True)
mergeddf['srtype'].fillna('None Selected', inplace=True)
mergeddf['riskrating'].fillna(0, inplace=True)
mergeddf.fillna('N/A', inplace = True)


## Export as geojson
geojson = df_to_geojson(mergeddf, cols_to_keep, lat='latitude_SR', lon='longitude_SR')

fileName = "{}{}".format(last_fetch_time, ".geojson")
with open(fileName, 'w') as outfile:
    dump(geojson, outfile)

#call merge script to merge geojsons
merge

#update last fetch time
date_today = date.today()
next_fetch_time = date_today.strftime("'%Y-%m-%dT12:00:00.000'")
f.write(next_fetch_time)
f.close()