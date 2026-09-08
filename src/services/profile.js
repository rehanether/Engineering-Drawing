const API_BASE = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

async function profileRequest(path, token, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Profile request failed.');
  return body;
}

export const bootstrapProfile = (token, referralCode) => profileRequest('/api/profile/bootstrap', token, { method: 'POST', body: JSON.stringify({ referralCode }) });
export const createWalletChallenge = (token) => profileRequest('/api/profile/wallet/challenge', token, { method: 'POST', body: '{}' });
export const verifyWallet = (token, address, signature) => profileRequest('/api/profile/wallet/verify', token, { method: 'POST', body: JSON.stringify({ address, signature }) });
