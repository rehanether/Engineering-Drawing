const test = require('node:test');
const assert = require('node:assert/strict');
const { Wallet, verifyMessage } = require('ethers');
const { createProfileService, normalizeReferralCode } = require('./profile-service');

test('normalizes only safe referral codes', () => {
  assert.equal(normalizeReferralCode(' edgabc123 '), 'EDGABC123');
  assert.equal(normalizeReferralCode('bad-link!'), '');
  assert.equal(normalizeReferralCode('short'), '');
});

test('creates profiles and records a referral only once', async () => {
  const service = createProfileService(null, { referralCredits: 25, welcomeCredits: 10, referralEdg: 100, referralBnb: 0.001 });
  const referrer = await service.bootstrap('user_referrer', '');
  const referred = await service.bootstrap('user_referred', referrer.referral_code);
  assert.equal(referred.referred_by, referrer.account_id);
  await service.bootstrap('user_referred', 'EDGNOTREAL');
  const summary = await service.summary(referrer.account_id);
  assert.deepEqual(summary.referrals, { total: 1, qualified: 0 });
});

test('qualifies a referral idempotently and creates all configured reward assets', async () => {
  const service = createProfileService(null, { referralCredits: 25, welcomeCredits: 10, referralEdg: 100, referralBnb: 0.001 });
  const referrer = await service.bootstrap('user_referrer', '');
  const referred = await service.bootstrap('user_referred', referrer.referral_code);
  const first = await service.activateReferral(referred.account_id);
  const second = await service.activateReferral(referred.account_id);
  assert.equal(first.credits, 25);
  assert.equal(second, null);
  const summary = await service.summary(referrer.account_id);
  assert.equal(summary.referrals.qualified, 1);
  assert.equal(summary.rewards.creditEarned, 25);
  assert.equal(summary.rewards.edgPending, 100);
  assert.equal(summary.rewards.bnbPending, 0.001);
});

test('links a wallet only after a valid challenge signature', async () => {
  const service = createProfileService(null);
  const profile = await service.bootstrap('user_wallet', '');
  const wallet = Wallet.createRandom();
  const challenge = await service.issueWalletChallenge(profile.account_id, 'https://www.engineeringdrawing.io');
  const signature = await wallet.signMessage(challenge.message);
  const result = await service.consumeWalletChallenge(profile.account_id, wallet.address, signature, verifyMessage);
  assert.deepEqual(result, { ok: true });
  const refreshed = await service.bootstrap('user_wallet', '');
  assert.equal(refreshed.wallet_address, wallet.address);
});
