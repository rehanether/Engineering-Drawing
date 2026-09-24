const configuredApiBase = process.env.REACT_APP_API_BASE_URL || '';
const API_BASE = /^https?:\/\//.test(configuredApiBase) ? configuredApiBase.replace(/\/$/, '') : '';

async function request(path, authToken, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Binance Pay could not complete this request.');
  return body;
}

export const getBinancePayConfig = (authToken) => request('/api/payments/binance-pay/config', authToken);
export const createBinancePayOrder = (productId, authToken = '') => request('/api/payments/binance-pay/orders', authToken, { method: 'POST', body: JSON.stringify({ productId }) });
export const getBinancePayOrder = (authToken, merchantTradeNo) => request(`/api/payments/binance-pay/orders/${encodeURIComponent(merchantTradeNo)}`, authToken);

export async function startBinanceCheckout(productId, authToken = '') {
  const order = await createBinancePayOrder(productId, authToken);
  if (!order.checkoutUrl && !order.universalUrl) throw new Error('Binance Pay returned no checkout link.');
  localStorage.setItem(`${productId}PaymentOrder`, order.merchantTradeNo);
  window.location.assign(order.checkoutUrl || order.universalUrl);
  return order;
}
