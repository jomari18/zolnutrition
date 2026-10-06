"""Build the bundled basic-food subset from the official USDA SR Legacy CSV ZIP.
Usage: python3 scripts/build-basic-foods.py /path/to/FoodData_Central_sr_legacy_food_csv_2018-04.zip
No API key, database writes or runtime downloads required.
"""
import csv, io, json, re, sys, zipfile
from pathlib import Path
z=zipfile.ZipFile(sys.argv[1]);prefix=next(n for n in z.namelist() if n.endswith('/food.csv')).removesuffix('food.csv')
def rows(name): return csv.DictReader(io.TextIOWrapper(z.open(prefix+name),encoding='utf-8-sig'))
groups={'1':'Dairy & eggs','2':'Herbs & spices','4':'Oils & fats','5':'Chicken & poultry','9':'Fruit','10':'Pork','11':'Vegetables','12':'Nuts & seeds','13':'Beef','15':'Fish & seafood','16':'Beans & tofu','17':'Lamb & other meat','20':'Grains & pasta','8':'Cereals & oats','18':'Bread & wraps'}
foods={r['fdc_id']:r for r in rows('food.csv') if r['food_category_id'] in groups}
nutrients={}
keys={'1008':'calories','1003':'protein','1005':'carbs','1004':'fat'}
for r in rows('food_nutrient.csv'):
 if r['fdc_id'] in foods and r['nutrient_id'] in keys and r['amount']!='':nutrients.setdefault(r['fdc_id'],{})[keys[r['nutrient_id']]]=float(r['amount'])
def clean(s):
 s=re.sub(r', broilers or fryers','',s,flags=re.I)
 s=re.sub(r', domestic|, fresh|, separable|, composite of trimmed retail cuts', '', s,flags=re.I)
 s=s.replace('separable lean only','lean only').replace('separable lean and fat','lean and fat')
 s=re.sub(r', trimmed to [^,]+', '',s,flags=re.I)
 s=s.replace(', all grades', '').replace(', retail cuts','')
 return s
popular=[171477,171478,171077,173424,168878,173944,174257,171995]
result=[]
for fid,r in foods.items():
 n=nutrients.get(fid,{})
 if len(n)!=4:continue
 description=r['description']
 if r['food_category_id']=='8' and not re.search(r'^Cereals, (oats|oat|corn|rice|wheat|barley|millet|farina|grits)',description,re.I):continue
 if r['food_category_id']=='18' and not re.search(r'^(Bread|Rolls|Bagels|Tortillas|English muffins)',description,re.I):continue
 if re.search(r'KFC|McDONALD|BURGER KING|WENDY|POPEYES|KENTUCKY|SUBWAY|Restaurant|Fast food|OSCAR MAYER|TYSON|PERDUE|MORNINGSTAR|BOCA|KELLOGG|MORI-NU|GARDENBURGER',description,re.I):continue
 name=clean(description)
 # Raw/uncooked must not be mistaken for cooked by substring matching.
 prep='Raw' if re.search(r'\b(raw|uncooked)\b',description,re.I) else 'Cooked' if re.search(r'\b(cooked|roasted|boiled|grilled|broiled|fried|baked|stewed|braised|steamed)\b',description,re.I) else 'Canned' if 'canned' in description.lower() else 'Other'
 result.append({'fdcId':int(fid),'name':name,'description':description,'category':groups[r['food_category_id']],'preparation':prep,'serving_size_g':100,**n})
result.sort(key=lambda f:(popular.index(f['fdcId']) if f['fdcId'] in popular else 100,f['name']))
path=Path(__file__).resolve().parents[1]/'src/data/basicFoods.json';path.write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
print(len(result),'foods;',path.stat().st_size,'bytes')
