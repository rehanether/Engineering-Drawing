const configuredApiBase = process.env.REACT_APP_API_BASE_URL || '';
const API_BASE = /^https?:\/\//.test(configuredApiBase)
  ? configuredApiBase.replace(/\/$/, '')
  : '';

function fallbackUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function getEdgAccountId() {
  const existing = localStorage.getItem('edg-account-id');
  if (existing) return existing;
  const accountId = window.crypto?.randomUUID?.() || fallbackUuid();
  localStorage.setItem('edg-account-id', accountId);
  return accountId;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-EDG-Account-ID': getEdgAccountId(),
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || 'The EDG service could not complete this request.');
    error.code = body.code;
    error.entitlement = body.entitlement;
    throw error;
  }
  return body;
}

export function generateEngineeringBrief(prompt) {
  return request('/api/ai/generations', { method: 'POST', body: JSON.stringify({ prompt }) });
}

export function getAiStatus() {
  return request('/api/ai/status');
}

export async function buyAiCredits() {
  const body = await request('/api/payments/nowpayments/ai-credits/invoice', { method: 'POST', body: '{}' });
  if (!body.invoiceUrl) throw new Error('The checkout provider returned no payment link.');
  localStorage.setItem('edg-ai-payment-order', body.orderId);
  window.location.assign(body.invoiceUrl);
}

export function getAiPaymentStatus(orderId) {
  return request(`/api/payments/nowpayments/ai-credits/status/${encodeURIComponent(orderId)}`);
}
