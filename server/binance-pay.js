const crypto = require('crypto');

const DEFAULT_BASE_URL = 'https://bpay.binanceapi.com';

function credentialsFrom(env = process.env) {
  return {
    apiKey: String(env.BINANCE_PAY_CERT_SN || env.BINANCE_PAY_API_KEY || '').trim(),
    secretKey: String(env.BINANCE_PAY_SECRET_KEY || '').trim(),
    baseUrl: String(env.BINANCE_PAY_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ''),
  };
}

function isConfigured(env = process.env) {
  const { apiKey, secretKey } = credentialsFrom(env);
  return Boolean(apiKey && secretKey && String(env.BINANCE_PAY_ENABLED || '').toLowerCase() === 'true');
}

function nonce() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(32);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

function signPayload(timestamp, requestNonce, body, secretKey) {
  return crypto.createHmac('sha512', secretKey)
    .update(`${timestamp}\n${requestNonce}\n${body}\n`)
    .digest('hex')
    .toUpperCase();
}

function safeEqual(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left.toUpperCase());
  const b = Buffer.from(right.toUpperCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyWebhook({ timestamp, requestNonce, body, signature }, env = process.env) {
  const { secretKey } = credentialsFrom(env);
  if (!secretKey || !timestamp || !requestNonce || !body || !signature) return false;
  const age = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(age) || age > 5 * 60 * 1000) return false;
  return safeEqual(signPayload(timestamp, requestNonce, body, secretKey), signature);
}

async function request(endpoint, payload, env = process.env) {
  const { apiKey, secretKey, baseUrl } = credentialsFrom(env);
  if (!apiKey || !secretKey) throw new Error('Binance Pay credentials are not configured.');
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const requestNonce = nonce();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'BinancePay-Timestamp': timestamp,
      'BinancePay-Nonce': requestNonce,
      'BinancePay-Certificate-SN': apiKey,
      'BinancePay-Signature': signPayload(timestamp, requestNonce, body, secretKey),
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.status !== 'SUCCESS' || result.code !== '000000') {
    const error = new Error('Binance Pay rejected the request.');
    error.providerCode = result.code || String(response.status);
    throw error;
  }
  return result.data;
}

function createOrder(payload, env) {
  return request('/binancepay/openapi/v3/order', payload, env);
}

function queryOrder(merchantTradeNo, env) {
  return request('/binancepay/openapi/order/query', { merchantTradeNo }, env);
}

module.exports = { createOrder, credentialsFrom, isConfigured, queryOrder, signPayload, verifyWebhook };
