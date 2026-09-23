const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { allowedOriginsFor, privateApiResponse, apiMethodGuard, jsonRequestGuard, apiErrorHandler } = require('./security-policy');

test('production origins exclude localhost, wildcard and malformed origins', () => {
  assert.equal(allowedOriginsFor({ NODE_ENV: 'production' }).has('http://localhost:3000'), false);
  assert.equal(allowedOriginsFor({}).has('http://localhost:3000'), true);
  const origins = allowedOriginsFor({ VERCEL_ENV: 'production', CORS_ORIGINS: '*,https://good.example,https://good.example/path,http://unsafe.example,https://user:pass@bad.example' });
  assert.deepEqual([...origins], ['https://good.example']);
});

test('API responses are not cached and parser failures return safe client errors', async () => {
  const app = express();
  app.use(privateApiResponse);
  app.use(express.json({ limit: '16kb' }));
  app.post('/test', (_req, res) => res.json({ ok: true }));
  app.use(apiErrorHandler);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}/test`;
    for (const [body, expected] of [['{}', 200], ['{"private":"secret",', 400], [JSON.stringify({ value: 'x'.repeat(17000) }), 413]]) {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      assert.equal(response.status, expected);
      assert.match(response.headers.get('cache-control'), /no-store/);
      assert.equal(response.headers.get('vercel-cdn-cache-control'), 'no-store');
      assert.equal((await response.text()).includes('secret'), false);
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('API accepts only expected methods and JSON POST bodies', async () => {
  const app = express();
  app.use('/api', privateApiResponse, apiMethodGuard, jsonRequestGuard);
  app.post('/api/test', (_req, res) => res.json({ ok: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/test`;
    const methodResponse = await fetch(base, { method: 'DELETE' });
    assert.equal(methodResponse.status, 405);
    assert.equal(methodResponse.headers.get('allow'), 'GET, POST, OPTIONS');
    const contentTypeResponse = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'test' });
    assert.equal(contentTypeResponse.status, 415);
    const jsonResponse = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(jsonResponse.status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
