const configuredApiBase = process.env.REACT_APP_API_BASE_URL || '';
const API_BASE = /^https?:\/\//.test(configuredApiBase) ? configuredApiBase.replace(/\/$/, '') : '';

async function commerceRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The purchase could not be verified.');
  return body;
}

export function verifyEdgPurchase(productId, txHash, walletAddress) {
  return commerceRequest('/api/commerce/edg/verify', {
    method: 'POST',
    body: JSON.stringify({ productId, txHash, walletAddress }),
  });
}

export function getProductEntitlement(productId, walletAddress) {
  const query = walletAddress ? `?wallet=${encodeURIComponent(walletAddress)}` : '';
  return commerceRequest(`/api/commerce/entitlements/${encodeURIComponent(productId)}${query}`);
}
