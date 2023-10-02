import os
import glob
import geojson

json_dir_name = "./"
json_pattern = os.path.join(json_dir_name,'*.geojson')
file_list = glob.glob(json_pattern)

geojson_fmt = {'features':[], 'type':'FeatureCollection'}


for file in file_list:
    with open(file) as f:
        datasets = geojson.load(f)
        for feature in datasets.features:
            geojson_fmt['features'].append(feature)

with open('tree11_collection.geojson', 'w') as f:
    geojson.dump(geojson_fmt, f)
# print("merge is called")