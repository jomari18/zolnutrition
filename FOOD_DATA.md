# Basic-food data

Bundled catalog: 4,882 entries derived from USDA FoodData Central SR Legacy (April 2018). These are reference estimates, not a live or complete international food database.

Source: https://fdc.nal.usda.gov/download-datasets/
Archive: https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip
Retrieved: 2026-10-04
Archive SHA-256: `b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0`

Each record preserves its FDC ID, full source description, and energy/protein/carbohydrate/fat per 100 g edible portion. Required nutrient IDs are 1008 (kcal), 1003 (protein), 1005 (carbohydrate by difference), and 1004 (total lipid). Records missing any required value are omitted; missing values are not treated as zero.

The subset covers dairy/eggs, herbs, oils, poultry, fruit, pork, vegetables, nuts, beef, seafood, legumes, lamb/other meat, grains/pasta, generic cereals, and bread/wraps. Restaurant/fast-food categories are excluded; selected branded names are filtered. Raw/cooked/canned labels are derived from source descriptions. Simplified display names remove some grading/trimming wording; selecting a food shows the original description and source link. Match that description to the food actually weighed.

Rebuild with Python's standard library:

```sh
python3 scripts/build-basic-foods.py /path/to/FoodData_Central_sr_legacy_food_csv_2018-04.zip
```

The downloaded archive is not included in this package. The derived JSON is loaded as a separate chunk and searched locally. No USDA API key or database migration is needed. Common Filipino/English aliases only map names; they do not create nutrition estimates for local recipes. Filipino prepared dishes such as adobo or sinigang still need recipe-specific manual entries.

Packaged products remain separate: Open Food Facts, https://world.openfoodfacts.org, under ODbL. Search is submitted explicitly via the keyword-supporting CGI endpoint, with timeout, cancellation, caching, and minimum request spacing. It is worldwide; English names are preferred when available, but not every product is translated. Results missing core macros are omitted. Always check the actual label. No Open Food Facts bulk data is bundled.
