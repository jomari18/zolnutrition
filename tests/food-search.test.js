import { test } from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {searchFoods,packagedSearchUrl} from '../src/foodSearchUtils.js';
import {normalizeProducts,scaleNutrition,mealRow} from '../src/lib.js';
const foods=JSON.parse(readFileSync(new URL('../src/data/basicFoods.json',import.meta.url)));
test('basic catalog has complete per-100g nutrition and unique USDA references',()=>{
 assert.ok(foods.length>4000); assert.equal(new Set(foods.map(f=>f.fdcId)).size,foods.length);
 for(const f of foods){assert.equal(f.serving_size_g,100);assert.equal(f.id,undefined);for(const k of ['calories','protein','carbs','fat'])assert.ok(Number.isFinite(f[k])&&f[k]>=0)}
});
test('chicken cooked search finds plain roast breast and scales verified USDA values',()=>{
 const results=searchFoods(foods,'chicken breast cooked');const breast=results.find(f=>f.fdcId===171477);assert.ok(breast);
 assert.equal(scaleNutrition(breast,200).calories,330);assert.equal(mealRow({...breast,quantity_g:200},'test','2026-10-04').food_id,null);
});
test('cooked and raw searches and preparation filters stay distinct',()=>{
 const raw=searchFoods(foods,'chicken breast','All','Raw');assert.ok(raw.length>0);assert.ok(raw.every(f=>f.preparation==='Raw'));
 const cooked=searchFoods(foods,'steak cooked');assert.ok(cooked.length>0);assert.ok(cooked.every(f=>f.preparation==='Cooked'));
 assert.equal(searchFoods(foods,'zzzznomatch').length,0);
});
test('familiar aliases and category filters retrieve actual source foods',()=>{
 assert.ok(searchFoods(foods,'eggs cooked').some(f=>f.fdcId===173424));
 assert.ok(searchFoods(foods,'bangus cooked').some(f=>f.fdcId===171995));
 assert.ok(searchFoods(foods,'monggo').some(f=>f.fdcId===174257));
 assert.ok(searchFoods(foods,'kanin').every(f=>f.preparation==='Cooked'));
 assert.ok(searchFoods(foods,'','Fruit').every(f=>f.category==='Fruit'));
});
test('keyword lookup uses CGI endpoint and preserves user query safely',()=>{
 const url=new URL(packagedSearchUrl('chicken & rice'));assert.equal(url.pathname,'/cgi/search.pl');assert.equal(url.searchParams.get('search_terms'),'chicken & rice');assert.equal(url.searchParams.get('lc'),'en');assert.equal(url.searchParams.has('countries_tags'),false);
});
test('packaged products use available English names and omit missing macros',()=>{
 const n={'energy-kcal_100g':100,proteins_100g:5,carbohydrates_100g:10,fat_100g:4};
 const rows=normalizeProducts([{product_name:'Pollo',product_name_en:'Chicken',nutriments:n},{product_name:'Unknown',nutriments:{'energy-kcal_100g':80}}]);assert.equal(rows.length,1);assert.equal(rows[0].name,'Chicken');
});
