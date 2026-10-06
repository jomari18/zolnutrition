import { userError } from './errors.js';
export const USERNAME_TAKEN = 'Username already taken. Choose another.';
export function registrationError(error) {
  if (error?.code === 'username_taken' ||
      (error?.code === '23505' && /profiles_username_unique/i.test(error?.message || '')))
    return userError(USERNAME_TAKEN);
  if (/database error (saving|creating) new user/i.test(error?.message || '') || error?.code === 'unexpected_failure')
    return userError("We couldn't create your account. Your username may already be taken. Try a different username; if it still fails, contact support.");
  return error;
}
// This optional RPC exposes only availability, never profile rows or emails.
export async function checkRegistrationUsername(client, value) {
  const username = String(value || '').trim();
  if (username.length < 3 || username.length > 30)
    throw userError('Use a username with 3–30 characters.');
  const { data, error } = await client.rpc('zn_registration_username_available_v1', { p_username: username });
  if (error) {
    // Old deployments remain usable without the optional function.
    if (error.code === 'PGRST202' || error.code === '42883') return username;
    throw userError("We couldn't check this username. Check your connection and try again.");
  }
  if (data === false) throw userError(USERNAME_TAKEN);
  if (data !== true) throw userError("We couldn't check this username. Please try again.");
  return username;
}
