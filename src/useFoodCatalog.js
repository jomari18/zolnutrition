import { useEffect, useState } from 'react';
let pending;
function load() {
  if (!pending) pending = import('./data/basicFoods.json').then(m => m.default).catch(e => { pending = null; throw e; });
  return pending;
}
export default function useFoodCatalog() {
  const [foods,setFoods]=useState([]),[error,setError]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{ let alive=true; setError(false); load().then(rows=>{if(alive)setFoods(rows)}).catch(()=>{if(alive)setError(true)});return()=>{alive=false} },[attempt]);
  return {catalog:foods,catalogError:error,retryCatalog:()=>setAttempt(n=>n+1)};
}
