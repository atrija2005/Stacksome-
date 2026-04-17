/**
 * Stacksome production readiness test
 * Usage: node scripts/test-prod.js
 */

const BASE = 'https://stacksome.vercel.app';
const DEV_USER_COOKIE = ''; // empty — tests auth-protected routes will expect 401

let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗  ${name}`);
    console.log(`       → ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

async function get(path, expectStatus = 200) {
  const res = await fetch(`${BASE}${path}`);
  assert(res.status === expectStatus, `Expected ${expectStatus}, got ${res.status} for GET ${path}`);
  return res;
}

async function post(path, body, expectStatus = 200) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  assert(res.status === expectStatus, `Expected ${expectStatus}, got ${res.status} for POST ${path}`);
  return res;
}

(async () => {
  console.log(`\nStacksome Production Test Suite`);
  console.log(`Target: ${BASE}`);
  console.log(`─────────────────────────────────\n`);

  // ── Pages ──────────────────────────────────────────────────────────────────
  console.log('Pages');
  await test('Landing page loads (GET /)', async () => {
    const res = await get('/');
    const text = await res.text();
    assert(text.includes('Stacksome') || text.includes('stacksome'), 'Page should contain "Stacksome"');
  });

  await test('Landing page (GET /landing)', async () => {
    const res = await get('/landing');
    const text = await res.text();
    assert(text.includes('Stacksome') || text.includes('stacksome'), 'Page should contain "Stacksome"');
  });

  await test('404 page returns 404', async () => {
    await get('/this-page-does-not-exist', 404);
  });

  // ── Auth-protected routes return 401 without session ──────────────────────
  console.log('\nAuth — unauthenticated requests should be rejected');
  await test('GET /api/profile → 401', async () => {
    await get('/api/profile', 401);
  });

  await test('POST /api/generate-list → 401', async () => {
    const res = await fetch(`${BASE}/api/generate-list`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('GET /api/weekly-list → 401', async () => {
    await get('/api/weekly-list', 401);
  });

  await test('POST /api/signal → 401', async () => {
    const res = await fetch(`${BASE}/api/signal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  await test('GET /api/stats → 401', async () => {
    await get('/api/stats', 401);
  });

  // ── Public API endpoints ───────────────────────────────────────────────────
  console.log('\nPublic API');
  await test('POST /api/subscribe — missing email returns 400', async () => {
    const res = await post('/api/subscribe', { interests: 'AI' }, 400);
    const json = await res.json();
    assert(json.error, 'Should return error message');
  });

  await test('POST /api/subscribe — missing interests returns 400', async () => {
    const res = await post('/api/subscribe', { email: 'test@test.com' }, 400);
    const json = await res.json();
    assert(json.error, 'Should return error message');
  });

  await test('POST /api/expand-goal — missing goal returns 400 or 401', async () => {
    const res = await fetch(`${BASE}/api/expand-goal`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert([400, 401].includes(res.status), `Expected 400 or 401, got ${res.status}`);
  });

  await test('GET /api/unsubscribe — missing token returns 400', async () => {
    const res = await get('/api/unsubscribe', 400);
  });

  // ── Cron endpoint ──────────────────────────────────────────────────────────
  console.log('\nCron');
  await test('GET /api/cron/weekly-digest — no auth returns 401', async () => {
    await get('/api/cron/weekly-digest', 401);
  });

  // ── Logo assets ────────────────────────────────────────────────────────────
  console.log('\nAssets');
  await test('GET /logo.svg — exists', async () => {
    const res = await get('/logo.svg');
    const ct = res.headers.get('content-type') || '';
    assert(ct.includes('svg') || ct.includes('xml') || ct.includes('image'), `Unexpected content-type: ${ct}`);
  });

  await test('GET /logo-icon.svg — exists', async () => {
    await get('/logo-icon.svg');
  });

  await test('GET /logo-dark.svg — exists', async () => {
    await get('/logo-dark.svg');
  });

  await test('GET /favicon.ico — exists', async () => {
    const res = await fetch(`${BASE}/favicon.ico`);
    assert(res.status !== 404, 'favicon.ico should exist');
  });

  // ── Supabase connectivity ──────────────────────────────────────────────────
  console.log('\nSupabase connectivity (via auth callback shape)');
  await test('GET /api/auth/callback — no code param redirects gracefully', async () => {
    const res = await fetch(`${BASE}/api/auth/callback`, { redirect: 'manual' });
    assert([302, 307, 308].includes(res.status), `Expected redirect, got ${res.status}`);
    const loc = res.headers.get('location') || '';
    assert(loc.includes('error') || loc.includes('/'), `Redirect location should be valid: ${loc}`);
  });

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n─────────────────────────────────`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failed === 0) {
    console.log(`\n✓ All tests passed. Ready to go public.\n`);
  } else {
    console.log(`\n✗ ${failed} test(s) failed. Review above before going public.\n`);
    process.exit(1);
  }
})();
