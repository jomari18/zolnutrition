import test from 'node:test';
import assert from 'node:assert/strict';
import { displayName, validateDisplayName } from '../src/displayName.js';
test('display names prefer explicit metadata and support legacy or nameless accounts',()=>{
  assert.equal(displayName({user_metadata:{display_name:' Jo  Mari ',full_name:'Full Name',username:'user'}}),'Jo Mari');
  assert.equal(displayName({user_metadata:{full_name:'Legacy Name'}}),'Legacy Name');
  assert.equal(displayName({user_metadata:{display_name:123,username:'legacy'}}),'legacy');
  assert.equal(displayName({email:'private@example.com'}),'');
});
test('display name validation rejects blank/oversized input and preserves international names',()=>{
  assert.throws(()=>validateDisplayName(' \n '),/Enter a display name/);
  assert.throws(()=>validateDisplayName('a'.repeat(51)),/50 characters/);
  assert.equal(validateDisplayName(' José   李 '),'José 李');
});
