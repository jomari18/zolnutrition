import React, { useEffect, useMemo, useRef, useState } from 'react';
import { normalizeProducts } from './lib';
import { searchFoods, packagedSearchUrl } from './foodSearchUtils.js';
import { Field, round } from './ui';
let nextProductRequest = 0;
export default function FoodSearch({ foods, catalog, catalogError, retryCatalog, busy, onChoose }) {
  const [query,setQuery]=useState(''),[mode,setMode]=useState('Basics'),[category,setCategory]=useState('All'),[preparation,setPreparation]=useState('All'),[limit,setLimit]=useState(12),[products,setProducts]=useState([]),[status,setStatus]=useState(''),[searching,setSearching]=useState(false);
  const request=useRef(null),cache=useRef(new Map());
  useEffect(()=>()=>request.current?.abort(),[]);
  const clearRequest=()=>{request.current?.abort(); request.current=null;setSearching(false);setProducts([]);setStatus('');};
  const changeQuery=value=>{clearRequest();setQuery(value);setLimit(12)};
  const categories=useMemo(()=>[...new Set(catalog.map(f=>f.category))].sort(),[catalog]);
  const matches=useMemo(()=>searchFoods(catalog,query,category,preparation),[catalog,query,category,preparation]);
  const personal=useMemo(()=>query.trim()?searchFoods(foods,query).slice(0,6):[],[foods,query]);
  const choose=f=>{clearRequest();setQuery('');setLimit(12);onChoose(f)};
  async function lookup() {
    const q=query.trim();if(q.length<2){setStatus('Enter at least two characters.');return}
    clearRequest();
    const key=q.toLowerCase();if(cache.current.has(key)){setProducts(cache.current.get(key));return}
    if(Date.now()<nextProductRequest){setStatus('Please wait a few seconds before searching again.');return}
    nextProductRequest=Date.now()+6500;
    const controller=new AbortController();request.current=controller;setSearching(true);setStatus('Searching packaged products…');
    const timeout=setTimeout(()=>controller.abort(),10000);
    try {
      const response=await fetch(packagedSearchUrl(q),{signal:controller.signal});
      if(!response.ok) throw Error('unavailable');
      const data=await response.json();const rows=normalizeProducts(data.products);
      if(request.current!==controller)return;
      cache.current.set(key,rows);if(cache.current.size>40)cache.current.delete(cache.current.keys().next().value);
      setProducts(rows);setStatus(rows.length?'':'No products with complete nutrition found. Try another term, Basics, or enter the label manually.');
    } catch {
      if(request.current===controller)setStatus('Packaged search is unavailable. Try Search products again, use Basics, or enter the label manually.');
    } finally {clearTimeout(timeout);if(request.current===controller){setSearching(false);request.current=null}}
  }
  const result=(f,index,source)=> <button type="button" className="food-result" key={`${source}-${f.id||f.fdcId||index}`} disabled={busy} onClick={()=>choose(f)}>
    <strong>{f.name}</strong><span>{f.preparation && <em>{f.preparation}</em>} {round(f.calories)} kcal / {f.serving_size_g} g · P {f.protein} g · C {f.carbs} g · F {f.fat} g</span><small>{source}</small>
  </button>;
  return <section className="food-browser" aria-label="Find a food">
    <div className="food-source-switch" aria-label="Search source">{['Basics','Packaged'].map(m=><button type="button" key={m} aria-pressed={mode===m} onClick={()=>{clearRequest();setMode(m)}}>{m==='Basics'?'Basic foods':'Packaged / brands'}</button>)}</div>
    <Field label="Search foods" type="search" value={query} onChange={e=>changeQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();if(mode==='Packaged')lookup()}}} placeholder={mode==='Basics'?'Chicken breast, steak cooked, bangus…':'Brand or packaged product name…'} />
    {mode==='Basics' ? <>
      <div className="food-filters"><label>Food category<select aria-label="Food category" value={category} onChange={e=>{setCategory(e.target.value);setLimit(12)}}><option>All</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Preparation<select aria-label="Preparation" value={preparation} onChange={e=>{setPreparation(e.target.value);setLimit(12)}}>{['All','Raw','Cooked','Canned','Other'].map(p=><option key={p}>{p}</option>)}</select></label></div>
      {catalogError?<p className="bad" role="alert">Basic foods couldn't load. <button type="button" onClick={retryCatalog}>Retry catalog</button></p>:!catalog.length?<p role="status">Loading basic foods…</p>:<p className="muted" role="status">{matches.length.toLocaleString()} matches · USDA SR Legacy · per 100 g</p>}
      {!!personal.length && <div className="personal-food-results"><h3>Your food library</h3>{personal.map((f,i)=>result(f,i,'Your library'))}</div>}
      <div className="food-results" role="region" aria-label="Basic food results" tabIndex={0}>{matches.slice(0,limit).map((f,i)=>result(f,i,'USDA · FDC '+f.fdcId))}</div>
      {matches.length>limit && <button type="button" className="more-foods" onClick={()=>setLimit(n=>n+12)}>Show more foods</button>}
      {!!catalog.length && !matches.length && <p className="muted">No basic foods match these filters. Try a simpler name or enter your food below.</p>}
      <p className="food-search-note">Match the cut and preparation to what you weighed. Values are estimates for the edible portion; account for added oil or sauce separately when not included in the selected food.</p>
      <a className="food-source-link" href="https://fdc.nal.usda.gov/download-datasets/" target="_blank" rel="noreferrer">Source: USDA SR Legacy (2018)</a>
    </> : <>
      <p className="food-search-note">Worldwide branded products from Open Food Facts. English names are used when available. For plain chicken, steak or rice, choose Basic foods.</p>
      <button type="button" className="more-foods" disabled={busy||searching||query.trim().length<2} onClick={lookup}>{searching?'Searching products…':'Search products'}</button>
      <p className="muted" role="status">{status}</p>
      <div className="food-results" role="region" aria-label="Packaged food results" tabIndex={0}>{products.map((f,i)=>result(f,i,'Open Food Facts'))}</div>
      <a className="food-source-link" href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts · ODbL · check your package label</a>
    </>}
  </section>;
}
