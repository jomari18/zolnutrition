import test from 'node:test';
import assert from 'node:assert/strict';
import { dispatchAndroidBack } from '../src/androidBack.js';
test('Android back closes only the top dialog before navigating', () => {
  let closed = 0, routed = false;
  const dialog = { dispatchEvent: e => { assert.equal(e.type, 'cancel'); closed++; } };
  assert.equal(dispatchAndroidBack({querySelectorAll: () => [{dispatchEvent: () => assert.fail()}, dialog]}, {dispatchEvent: e => {if(e.type === "zolnutrition:back") routed=true; return true;}}), true);
  assert.equal(closed, 1); assert.equal(routed, false);
});
test('Android back is consumed by screens, otherwise permits minimizing', () => {
  const target = new EventTarget(), doc = {querySelectorAll: () => []};
  assert.equal(dispatchAndroidBack(doc, target), false);
  target.addEventListener('zolnutrition:back', e => e.preventDefault());
  assert.equal(dispatchAndroidBack(doc, target), true);
});

test('Android back gives a SweetAlert priority over native dialogs and navigation', () => {
  const target = new EventTarget();
  target.addEventListener('zolnutrition:alert-back', event => event.preventDefault());
  assert.equal(dispatchAndroidBack({ querySelectorAll: () => assert.fail('must not close underlying dialog') }, target), true);
});
