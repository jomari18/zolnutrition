const VERIFY_AGAIN = 'Please verify a recovery code before changing your password.';
const REQUEST_MESSAGE = 'If an account exists for this email, a recovery code has been sent. Check your inbox and spam folder.';
const emailOf = user => user?.email?.trim().toLowerCase();

// Proof belongs to this controller and its nonpersistent recovery client only.
export function createPasswordRecovery(auth, normalAuth) {
  let email = '', proof = null, generation = 0, savedUser = null;
  let normalId;
  const clear = () => { generation++; proof = null; savedUser = null; email = ''; };
  const unwrap = response => { if (response.error) throw response.error; return response.data; };
  const failProof = () => { clear(); throw new Error(VERIFY_AGAIN); };
  const sameUser = (session, expected) => session?.user?.id === expected.id && emailOf(session.user) === expected.email;
  return {
    get verified() { return Boolean(proof); },
    get passwordSaved() { return Boolean(savedUser); },
    clear,
    accountChanged(session, event) {
      const next = session?.user?.id || null;
      const changed = normalId !== undefined && (normalId !== next || event === 'SIGNED_IN');
      normalId = next;
      if (changed) clear();
      return changed;
    },
    sessionChanged(event, session) {
      const changed = proof && !sameUser(session, proof);
      const unexpectedSignIn = email && event === 'SIGNED_IN';
      const interrupted = email && event === 'SIGNED_OUT' && !savedUser;
      if (changed || unexpectedSignIn || interrupted) { clear(); return true; }
      return false;
    },
    async request(address) {
      const normalized = address.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Enter a valid email.');
      clear();
      const attempt = generation;
      const response = await auth.resetPasswordForEmail(normalized);
      if (response.error && !['user_not_found', 'email_not_found'].includes(response.error.code)) throw response.error;
      if (attempt !== generation) throw new Error(VERIFY_AGAIN);
      email = normalized;
      return REQUEST_MESSAGE;
    },
    async verify(token) {
      if (!email) throw new Error('Request a recovery code for this email first.');
      if (!/^\d{6,10}$/.test(token.trim())) throw new Error('Enter the complete code from your email.');
      proof = null;
      const attempt = ++generation;
      const data = unwrap(await auth.verifyOtp({ email, token: token.trim(), type: 'recovery' }));
      const expected = { id: data?.user?.id, email };
      const current = unwrap(await auth.getSession());
      if (attempt !== generation || !expected.id || !sameUser(data?.session, expected) || !sameUser(current?.session, expected)) failProof();
      proof = expected;
    },
    async changePassword(password, confirmation) {
      if (!proof) throw new Error(VERIFY_AGAIN);
      if (password.length < 8) throw new Error('Use at least 8 characters for your new password.');
      if (password !== confirmation) throw new Error('Passwords do not match.');
      const expected = proof, attempt = generation;
      const current = unwrap(await auth.getSession());
      if (attempt !== generation || !sameUser(current?.session, expected)) failProof();
      const data = unwrap(await auth.updateUser({ password }));
      if (attempt !== generation || data?.user?.id !== expected.id) failProof();
      savedUser = expected;
      proof = null;
      await this.finish();
    },
    async finish() {
      if (!savedUser) throw new Error(VERIFY_AGAIN);
      const expected = savedUser, attempt = generation;
      unwrap(await auth.signOut({ scope: 'local' }));
      if (normalAuth) {
        const current = unwrap(await normalAuth.getSession());
        if (attempt !== generation) throw new Error(VERIFY_AGAIN);
        if (current?.session?.user?.id === expected.id) unwrap(await normalAuth.signOut({ scope: 'local' }));
      }
      clear();
    },
    async cancel() {
      clear();
      unwrap(await auth.signOut({ scope: 'local' }));
    },
  };
}
