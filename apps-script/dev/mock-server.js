/**
 * Local mock of the deployed Apps Script Web App. Runs the REAL backend
 * sources against in-memory Google services so the website can be developed
 * and demoed without a Google account.
 *
 *   node apps-script/dev/mock-server.js        → http://localhost:8787
 *
 * Demo logins: admin@demo.local / Admin12345   student@demo.local / Student123
 * Data lives in memory and resets on restart.
 */
'use strict';
const http = require('http');
const { loadGas } = require('../tests/load-gas');

const PORT = Number(process.env.MOCK_PORT || 8787);
const KEY = process.env.API_PROXY_SECRET || 'dev-proxy-secret';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const { G, env } = loadGas({ fetchHandler: () => ({ code: 404, body: '' }) });
Object.assign(env.store.props, { API_PROXY_SECRET: KEY, SETUP_TOKEN: 'dev-setup-token', SITE_URL });

const setup = G.handleRequest('POST', { action: 'runSetup', key: KEY, payload: { setupToken: 'dev-setup-token', driveRootFolderId: env.rootId,
  associationName: 'Metro Skating Association', adminEmail: 'admin@demo.local', adminPassword: 'Admin12345', sampleData: true, siteUrl: SITE_URL } });
if (!setup.success || !setup.data.ready) { console.error('Setup failed', JSON.stringify(setup, null, 2)); process.exit(1); }
const reg = G.handleRequest('POST', { action: 'register', key: KEY, payload: { email: 'student@demo.local', password: 'Student123', firstName: 'Ananya',
  lastName: 'Rao', dob: '2013-06-14', gender: 'FEMALE', parentName: 'Kiran Rao', parentMobile: '+91 90000 11111', city: 'Chennai', state: 'Tamil Nadu',
  academy: 'Sample Skating Academy', experienceLevel: 'Intermediate', acceptTerms: true, guardianConsentName: 'Kiran Rao' } });
if (!reg.success) console.warn('Demo student not created:', reg.message);

function send(res, obj) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET') {
    const q = Object.fromEntries(url.searchParams.entries());
    const payload = q.payload ? JSON.parse(q.payload) : {};
    return send(res, G.handleRequest('GET', { action: q.action, key: q.key, token: q.token, clientIp: q.clientIp, payload }));
  }
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 20e6) req.destroy(); });
  req.on('end', () => {
    let parsed = {};
    try { parsed = JSON.parse(body || '{}'); } catch (e) { parsed = {}; }
    send(res, G.handleRequest('POST', parsed));
  });
}).listen(PORT, () => {
  console.log('Mock Apps Script API on http://localhost:' + PORT + '  (API_PROXY_SECRET=' + KEY + ')');
  console.log('Admin:   admin@demo.local / Admin12345');
  console.log('Student: student@demo.local / Student123');
});
