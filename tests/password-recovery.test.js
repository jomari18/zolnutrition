import test from 'node:test';
import assert from 'node:assert/strict';
import { createPasswordRecovery } from '../src/passwordRecovery.js';

const user = { id: 'recovery-user', email: 'athlete@example.test' };
function provider() {
  let session = null, updates = 0, requests = 0, signouts = 0;
  const auth = {
    async resetPasswordForEmail(email) { requests++; assert.equal(email, user.email); return { data: {}, error: null }; },
    async verifyOtp({ email, token, type }) {
      assert.equal(type, 'recovery'); assert.equal(email, user.email);
      if (token !== '123456') return { data: {}, error: { code: 'otp_expired' } };
      session = { user }; return { data: { user, session }, error: null };
    },
    async getSession() { return { data: { session }, error: null }; },
    async updateUser({ password }) { updates++; assert.equal(password, 'StrongPass123'); return { data: { user }, error: null }; },
    async signOut() { signouts++; session = null; return { error: null }; },
  };
  return { auth, get updates() { return updates; }, get requests() { return requests; }, get signouts() { return signouts; }, setSession(s) { session = s; } };
}

test('normal sign-in cannot authorize a password update without recovery OTP', async () => {
  const p = provider(), recovery = createPasswordRecovery(p.auth);
  p.setSession({ user });
  await assert.rejects(recovery.changePassword('StrongPass123', 'StrongPass123'), /verify.*code/i);
  assert.equal(p.updates, 0);
});

test('request, wrong OTP, valid OTP and password update require the full sequence', async () => {
  const p = provider(), recovery = createPasswordRecovery(p.auth);
  assert.match(await recovery.request(' Athlete@Example.Test '), /If.*account/i);
  await assert.rejects(recovery.verify('000000'), e => e.code === 'otp_expired');
  assert.equal(recovery.verified, false);
  await recovery.verify('123456');
  assert.equal(recovery.verified, true);
  await assert.rejects(recovery.changePassword('short', 'short'), /8/);
  await assert.rejects(recovery.changePassword('StrongPass123', 'different'), /match/);
  assert.equal(p.updates, 0);
  await recovery.changePassword('StrongPass123', 'StrongPass123');
  assert.equal(p.updates, 1); assert.equal(p.signouts, 1);
  assert.equal(recovery.verified, false);
});

test('email edits, resends and account switches invalidate recovery proof', async () => {
  for (const invalidate of [r => r.clear(), r => r.request(user.email), r => r.accountChanged({ user: { id: 'another-account' } })]) {
    const p = provider(), recovery = createPasswordRecovery(p.auth);
    recovery.accountChanged(null);
    await recovery.request(user.email); await recovery.verify('123456');
    await invalidate(recovery);
    await assert.rejects(recovery.changePassword('StrongPass123', 'StrongPass123'), /verify.*code/i);
    assert.equal(p.updates, 0);
  }
});

test('a changed recovery session and a stale verification response cannot authorize update', async () => {
  const p = provider(), recovery = createPasswordRecovery(p.auth);
  await recovery.request(user.email); await recovery.verify('123456');
  p.setSession({ user: { id: 'different', email: user.email } });
  await assert.rejects(recovery.changePassword('StrongPass123', 'StrongPass123'), /verify.*code/i);
  assert.equal(p.updates, 0);
  const q = provider(), pending = createPasswordRecovery(q.auth);
  let resolve;
  q.auth.verifyOtp = () => new Promise(r => { resolve = r; });
  await pending.request(user.email);
  const verify = pending.verify('123456'); pending.clear();
  resolve({ data: { user, session: { user } }, error: null });
  await assert.rejects(verify, /verify.*code/i);
  assert.equal(pending.verified, false);
});

test('unknown accounts have the same request outcome, while rate limits remain actionable', async () => {
  const p = provider(), recovery = createPasswordRecovery(p.auth);
  const generic = await recovery.request(user.email);
  p.auth.resetPasswordForEmail = async () => ({ error: { code: 'user_not_found' } });
  assert.equal(await recovery.request(user.email), generic);
  p.auth.resetPasswordForEmail = async () => ({ error: { status: 429 } });
  await assert.rejects(recovery.request(user.email), e => e.status === 429);
});

test('failed signout retries cleanup without repeating the password update', async () => {
  const p = provider(), recovery = createPasswordRecovery(p.auth);
  await recovery.request(user.email); await recovery.verify('123456');
  const signOut = p.auth.signOut;
  p.auth.signOut = async () => ({ error: new Error('Network unavailable') });
  await assert.rejects(recovery.changePassword('StrongPass123', 'StrongPass123'), /Network/);
  assert.equal(recovery.passwordSaved, true); assert.equal(p.updates, 1);
  p.auth.signOut = signOut;
  await recovery.finish();
  assert.equal(p.updates, 1); assert.equal(recovery.passwordSaved, false);
});

test('cleanup signs out a matching normal account and preserves an unrelated account', async () => {
  for (const id of ['recovery-user', 'other-user']) {
    const p = provider(); let signedOut = false;
    const normalAuth = {
      getSession: async () => ({ data: { session: { user: { id } } } }),
      signOut: async () => { signedOut = true; return {}; },
    };
    const recovery = createPasswordRecovery(p.auth, normalAuth);
    await recovery.request(user.email); await recovery.verify('123456');
    await recovery.changePassword('StrongPass123', 'StrongPass123');
    assert.equal(signedOut, id === 'recovery-user');
  }
});

test('a normal sign-in on the recovery client invalidates even same-user proof', async () => {
  const p = provider(), recovery = createPasswordRecovery(p.auth);
  await recovery.request(user.email); await recovery.verify('123456');
  assert.equal(recovery.sessionChanged('TOKEN_REFRESHED', { user }), false);
  assert.equal(recovery.sessionChanged('SIGNED_IN', { user }), true);
  await assert.rejects(recovery.changePassword('StrongPass123', 'StrongPass123'), /verify.*code/i);
  assert.equal(p.updates, 0);
});

test('a rejected recovery identity cannot grant password-update proof', async () => {
  const p = provider(), recovery = createPasswordRecovery(p.auth);
  p.auth.verifyOtp = async () => ({ data: { user: { ...user, email: 'wrong@example.test' }, session: { user: { ...user, email: 'wrong@example.test' } } } });
  await recovery.request(user.email);
  await assert.rejects(recovery.verify('123456'), /verify.*code/i);
  assert.equal(recovery.verified, false); assert.equal(p.updates, 0);
});

test('an account change during cleanup cannot sign out the new normal account', async () => {
  const p = provider(); let resolveSession, reachedSession;
  const reached = new Promise(resolve => { reachedSession = resolve; });
  const recovery = createPasswordRecovery(p.auth, {
    getSession: () => { reachedSession(); return new Promise(resolve => { resolveSession = resolve; }); },
    signOut: () => assert.fail('A changed normal account must not be signed out'),
  });
  recovery.accountChanged(null);
  await recovery.request(user.email); await recovery.verify('123456');
  const changing = recovery.changePassword('StrongPass123', 'StrongPass123');
  await reached;
  recovery.accountChanged({ user: { id: 'new-normal-user' } });
  resolveSession({ data: { session: { user: { id: 'new-normal-user' } } } });
  await assert.rejects(changing, /verify.*code/i);
});

test('an unrelated auth event during OTP verification invalidates its pending response', async () => {
  const p = provider(), recovery = createPasswordRecovery(p.auth);
  let resolve;
  p.auth.verifyOtp = () => new Promise(r => { resolve = r; });
  await recovery.request(user.email);
  const pending = recovery.verify('123456');
  recovery.sessionChanged('SIGNED_IN', { user });
  p.setSession({ user }); resolve({ data: { user, session: { user } } });
  await assert.rejects(pending, /verify.*code/i);
  assert.equal(recovery.verified, false);
});
