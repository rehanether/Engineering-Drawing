const test = require('node:test');
const assert = require('node:assert/strict');
const { isConfigured, signPayload, verifyWebhook } = require('./binance-pay');

test('signs Binance Pay payloads with uppercase HMAC SHA-512', () => {
  const signature = signPayload('1710000000000', 'abcdefghijklmnopqrstuvwxyzABCDEF', '{"ok":true}', 'secret');
  assert.match(signature, /^[A-F0-9]{128}$/);
  const timestamp = String(Date.now());
  const currentSignature = signPayload(timestamp, 'abcdefghijklmnopqrstuvwxyzABCDEF', '{"ok":true}', 'secret');
  assert.equal(verifyWebhook({ timestamp, requestNonce: 'abcdefghijklmnopqrstuvwxyzABCDEF', body: '{"ok":true}', signature: currentSignature }, { BINANCE_PAY_SECRET_KEY: 'secret' }), true);
  assert.equal(verifyWebhook({ timestamp, requestNonce: 'abcdefghijklmnopqrstuvwxyzABCDEF', body: '{"ok":false}', signature: currentSignature }, { BINANCE_PAY_SECRET_KEY: 'secret' }), false);
});

test('requires credentials and an explicit production enable switch', () => {
  const env = { BINANCE_PAY_CERT_SN: 'api', BINANCE_PAY_SECRET_KEY: 'secret' };
  assert.equal(isConfigured(env), false);
  assert.equal(isConfigured({ ...env, BINANCE_PAY_ENABLED: 'true' }), true);
});
