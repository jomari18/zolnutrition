import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
test('source modules have unambiguous names on case-insensitive systems',()=>{
 const names=readdirSync(new URL('../src/',import.meta.url)).filter(n=>/\.jsx?$/.test(n));
 const seen=new Map();
 for(const name of names){const key=name.replace(/\.jsx?$/,'').toLowerCase();assert.equal(seen.has(key),false,`${name} conflicts with ${seen.get(key)} on Windows`);seen.set(key,name)}
});
