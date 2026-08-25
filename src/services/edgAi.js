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
  try {
    const existing = localStorage.getItem('edg-account-id');
    if (existing) return existing;
  } catch (_error) {
    // Continue with an in-memory identifier when storage is unavailable.
  }
  const accountId = window.crypto?.randomUUID?.() || fallbackUuid();
  try { localStorage.setItem('edg-account-id', accountId); } catch (_error) { /* Private mode may block storage. */ }
  return accountId;
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 65_000);
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-EDG-Account-ID': getEdgAccountId(),
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The EDG service timed out. Please try again.');
    throw new Error('The EDG service is unreachable. Check your connection and try again.');
  } finally {
    window.clearTimeout(timeout);
  }
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
