const configuredApiBase = process.env.REACT_APP_API_BASE_URL || '';
const API_BASE = /^https?:\/\//.test(configuredApiBase) ? configuredApiBase.replace(/\/$/, '') : '';

async function request(path, authToken, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}`, ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Binance Pay could not complete this request.');
  return body;
}

export const getBinancePayConfig = (authToken) => request('/api/payments/binance-pay/config', authToken);
export const createBinancePayOrder = (authToken, fiatAmount, fiatCurrency) => request('/api/payments/binance-pay/orders', authToken, { method: 'POST', body: JSON.stringify({ fiatAmount, fiatCurrency }) });
export const getBinancePayOrder = (authToken, merchantTradeNo) => request(`/api/payments/binance-pay/orders/${encodeURIComponent(merchantTradeNo)}`, authToken);
