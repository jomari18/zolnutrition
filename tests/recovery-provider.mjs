// Local synthetic auth provider. No real accounts, email, or database access.
import { createServer } from 'node:http';
const email = 'athlete@example.test';
let stats, settings;
const reset = () => { stats = { requests: 0, verifies: 0, updates: 0, logouts: 0, nutritionQueries: 0 }; settings = {}; };
reset();
const user = (id = 'recovery-user') => ({ id, aud: 'authenticated', role: 'authenticated', email: id === 'recovery-user' ? email : 'other@example.test', app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() });
const session = account => ({ access_token: `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: account.id, exp: Math.floor(Date.now() / 1000) + 3600, aud: 'authenticated' })).toString('base64url')}.synthetic`, refresh_token: 'synthetic-refresh', expires_in: 3600, token_type: 'bearer', user: account });
createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  const reply = (body = {}, status = 200) => { res.statusCode = status; res.end(JSON.stringify(body)); };
  if (req.method === 'OPTIONS') return reply();
  let body = ''; for await (const chunk of req) body += chunk;
  const data = body ? JSON.parse(body) : {};
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/__reset') { reset(); return reply(stats); }
  if (path === '/__settings') { Object.assign(settings, data); return reply(); }
  if (path === '/__stats') return reply(stats);
  if (path.endsWith('/recover')) {
    stats.requests++;
    if (settings.delay) await new Promise(r => setTimeout(r, settings.delay));
    if (settings.rateLimit) return reply({ code: 'over_email_send_rate_limit', msg: 'Please retry after 60 seconds.' }, 429);
    return reply();
  }
  if (path.endsWith('/verify')) {
    stats.verifies++;
    if (data.type !== 'recovery' || data.email !== email || data.token !== '123456') return reply({ code: 'otp_expired', msg: 'Token has expired or is invalid' }, 403);
    return reply(session(user()));
  }
  if (path.endsWith('/token')) return reply(session(user(data.email === email ? 'recovery-user' : 'other-user')));
  if (path.endsWith('/logout')) {
    stats.logouts++;
    if (settings.logoutFailure) return reply({ code: 'unexpected_failure', msg: 'Synthetic signout failure' }, 500);
    return reply();
  }
  if (path.endsWith('/user')) {
    if (req.method === 'PUT') { stats.updates++; if (settings.updateFailure) return reply({ code: 'weak_password', msg: 'Choose another password' }, 422); }
    let id = 'recovery-user';
    try { id = JSON.parse(Buffer.from(req.headers.authorization.split('.')[1], 'base64url').toString()).sub; } catch {}
    return reply(user(id));
  }
  if (path.startsWith('/rest/v1/')) { stats.nutritionQueries++; return reply([]); }
  return reply({ error: 'Synthetic endpoint not found' }, 404);
}).listen(55502, '127.0.0.1', () => console.log('Synthetic recovery provider on http://127.0.0.1:55502'));
