'use strict';

/**
 * HTTP smoke checks against a running server (requires DATABASE_URL + npm start elsewhere).
 *
 * Usage:
 *   STABILIZATION_BASE_URL=http://127.0.0.1:3000 node scripts/stabilization-smoke.js
 *
 * Covers plan sections 2.1 (partial), 2.2 (401 without session), 2.5 (services/reviews).
 * Upload negatives (2.3) и полный админ CRUD — вручную или с curl и админ-cookie.
 */

const BASE = process.env.STABILIZATION_BASE_URL || 'http://127.0.0.1:3000';

async function expectJson(url, options, expectedStatus) {
  const res = await fetch(url, { ...options, redirect: 'manual' });
  if (res.status !== expectedStatus) {
    const body = await res.text().catch(() => '');
    throw new Error(`${url} → expected ${expectedStatus}, got ${res.status}. Body: ${body.slice(0, 200)}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return null;
  }
  return res.json();
}

async function main() {
  console.log('Stabilization smoke →', BASE);

  const gallery = await expectJson(`${BASE}/api/gallery`, {}, 200);
  if (!Array.isArray(gallery)) {
    throw new Error('/api/gallery must return JSON array');
  }

  const limited = await expectJson(`${BASE}/api/gallery?limit=1`, {}, 200);
  if (!Array.isArray(limited) || limited.length > 1) {
    throw new Error('/api/gallery?limit=1 must return at most one row');
  }

  const invalidLimit = await expectJson(`${BASE}/api/gallery?limit=not-a-number`, {}, 200);
  if (!Array.isArray(invalidLimit)) {
    throw new Error('/api/gallery invalid limit must still return array');
  }

  await expectJson(`${BASE}/api/services`, {}, 200);
  await expectJson(`${BASE}/api/reviews`, {}, 200);

  await expectJson(`${BASE}/api/admin/gallery`, { credentials: 'omit' }, 401);

  await expectJson(`${BASE}/`, {}, 200);

  console.log('Smoke finished OK.');
  console.log('');
  console.log('Manual UI checklist: docs/manual-ui-checklist-stabilization.txt');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
