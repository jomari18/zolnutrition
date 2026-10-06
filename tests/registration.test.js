import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRegistrationUsername, registrationError, USERNAME_TAKEN } from '../src/registration.js';
const client = response => ({ rpc: async (name, args) => {
  assert.equal(name, 'zn_registration_username_available_v1');
  assert.equal(args.p_username, 'Mojxd'); return response;
} });
test('registration availability blocks known duplicates and trims available names', async () => {
  await assert.rejects(checkRegistrationUsername(client({data:false}), ' Mojxd '), {message:USERNAME_TAKEN});
  assert.equal(await checkRegistrationUsername(client({data:true}), ' Mojxd '), 'Mojxd');
  await assert.rejects(checkRegistrationUsername({}, '  '), /3–30/);
});
test('missing optional RPC allows legacy signup while failed checks stop submission', async () => {
  for(const code of ['PGRST202','42883'])
    assert.equal(await checkRegistrationUsername(client({error:{code}}),'Mojxd'),'Mojxd');
  await assert.rejects(checkRegistrationUsername(client({error:{code:'42501'}}),'Mojxd'), /couldn't check/);
  await assert.rejects(checkRegistrationUsername(client({data:[]}), 'Mojxd'), /couldn't check/);
});
test('signup errors identify only known username conflicts and keep generic failures honest', () => {
  assert.equal(registrationError({code:'23505',message:'profiles_username_unique'}).message,USERNAME_TAKEN);
  assert.match(registrationError(new Error('Database error saving new user')).message,/may already be taken/);
  const unrelated={code:'23505',message:'other_unique'};
  assert.equal(registrationError(unrelated),unrelated);
  const credentials={code:'invalid_credentials'};
  assert.equal(registrationError(credentials),credentials);
});
