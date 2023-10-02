import pandas as pd
import requests
import json
trees_API = requests.get(
    'https://data.cityofnewyork.us/resource/hn5i-inap.json')
SR_API = requests.get(
    'https://data.cityofnewyork.us/resource/mu46-p9is.json?$where=createddate%3E%2701/01/2020%2014:20:00%27')
inspection_API = requests.get(
    "https://data.cityofnewyork.us/resource/4pt5-3vv4.json?$where=createddate%3E%272020-01-01T14:47:49.000%27")
WO_API = requests.get("https://data.cityofnewyork.us/resource/bdjm-n7q4.json")

# print(trees_API.status_code), print(SR_API.status_code), print(inspection_API.status_code), print(WO_API.status_code)

treedata = trees_API.text
treejson = json.loads(treedata)


SRdata = SR_API.text
SRjson = json.loads(SRdata)
# print(SRdata[:1])
# SRdata = inspection_API.text
# SRjson = json.loads(data)

inspectiondata = inspection_API.text
inspectionjson = json.loads(inspectiondata)

WOdata = WO_API.text
WOjson = json.loads(WOdata)


# Load into dataframes to join
dftrees = pd.DataFrame(treejson)
dfSR = pd.DataFrame(SRjson)
dfInspect = pd.DataFrame(inspectionjson)
dfWO = pd.DataFrame(WOjson)


dftrees = dftrees[['objectid',
                   'plantingspaceglobalid', 'globalid', 'location']]
dfSR = dfSR[['objectid', 'complaintnumber', 'srtype', 'srstatus', 'srresolution', 'boroughcode', 'communityboard', 'zipcode', 'physicalid', 'servicerequestparentglobalid',
             'globalid', 'initiateddate', 'closeddate', 'createddate', 'updateddate', 'complainttype', 'srcallertype', 'latitude', 'longitude', 'census_tract', 'complaintdetails']]
dfInspect = dfInspect[['objectid', 'inspectionstatus', 'treepointglobalid', 'plantingspaceglobalid', 'globalid',
                       'inspectiondate', 'closeddate', 'createddate', 'updateddate', 'location', 'servicerequestglobalid']]
dfWO = dfWO[['objectid', 'wotype', 'wostatus', 'boroughcode', 'communityboard', 'buildingnumber', 'streetname', 'wocategory', 'wowoodremains', 'zipcode', 'citycouncil', 'statesenate', 'stateassembly', 'congressional', 'physicalid', 'crossstreet1', 'crossstreet2', 'inspectionglobalid', 'globalid', 'wowireconflict', 'geometry', 'createddate', 'woentity', 'woproject', 'latitude',
             'longitude', 'census_tract', 'location', 'locationdetails', 'actualfinishdate', 'wocontract', 'closeddate', 'updateddate', 'projstartdate', 'recommendedspecies', 'crewglobalid', 'parkname', 'parkzone', 'wopriority', 'sidewalkdamage', 'cancelreason', 'canceldate', 'woequipment', 'sanitationassigneddate', 'plantingspaceglobalid', 'treepointglobalid', 'sanitationupdateddate']]


inspectWO = pd.merge(dfInspect, dfWO, left_on='globalid',
                     right_on='inspectionglobalid')


# Export to json

inspectWO.to_json(r'./inspectWO.json')
