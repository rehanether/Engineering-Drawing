const crypto = require('crypto');

const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{6,20}$/;

function normalizeReferralCode(value) {
  const code = String(value || '').trim().toUpperCase();
  return REFERRAL_CODE_PATTERN.test(code) ? code : '';
}

function createReferralCode() {
  return `EDG${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
}

function createProfileService(sql, options = {}) {
  const memoryProfiles = new Map();
  const memoryByCode = new Map();
  const memoryReferrals = new Map();
  const memoryRewards = [];
  const memoryChallenges = new Map();
  let tablesReady = false;
  const referralCredits = Math.max(0, Number(options.referralCredits || 25));
  const welcomeCredits = Math.max(0, Number(options.welcomeCredits || 10));
  const referralEdg = Math.max(0, Number(options.referralEdg || 0));
  const referralBnb = Math.max(0, Number(options.referralBnb || 0));

  async function ensureTables() {
    if (!sql || tablesReady) return;
    await sql`
      CREATE TABLE IF NOT EXISTS edg_user_profiles (
        account_id UUID PRIMARY KEY,
        clerk_user_id TEXT NOT NULL UNIQUE,
        referral_code TEXT NOT NULL UNIQUE,
        referred_by UUID REFERENCES edg_user_profiles(account_id),
        wallet_address TEXT UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS edg_referrals (
        id UUID PRIMARY KEY,
        referrer_id UUID NOT NULL REFERENCES edg_user_profiles(account_id),
        referred_id UUID NOT NULL UNIQUE REFERENCES edg_user_profiles(account_id),
        status TEXT NOT NULL DEFAULT 'registered',
        qualified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS edg_referrals_referrer_idx ON edg_referrals (referrer_id, created_at DESC)`;
    await sql`
      CREATE TABLE IF NOT EXISTS edg_referral_reward_ledger (
        id UUID PRIMARY KEY,
        account_id UUID NOT NULL REFERENCES edg_user_profiles(account_id),
        asset TEXT NOT NULL,
        amount NUMERIC(36, 18) NOT NULL,
        status TEXT NOT NULL,
        reason TEXT NOT NULL,
        reference_id TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        paid_at TIMESTAMPTZ
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS edg_wallet_challenges (
        account_id UUID PRIMARY KEY REFERENCES edg_user_profiles(account_id),
        nonce TEXT NOT NULL,
        message TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    tablesReady = true;
  }

  async function findByClerkUserId(clerkUserId) {
    if (!sql) return memoryProfiles.get(clerkUserId) || null;
    await ensureTables();
    const rows = await sql`
      SELECT account_id, clerk_user_id, referral_code, referred_by, wallet_address, created_at
      FROM edg_user_profiles WHERE clerk_user_id = ${clerkUserId} LIMIT 1
    `;
    return rows[0] || null;
  }

  async function findByReferralCode(referralCode) {
    if (!sql) return memoryByCode.get(referralCode) || null;
    await ensureTables();
    const rows = await sql`
      SELECT account_id, clerk_user_id, referral_code, referred_by, wallet_address, created_at
      FROM edg_user_profiles WHERE referral_code = ${referralCode} LIMIT 1
    `;
    return rows[0] || null;
  }

  async function insertReward(accountId, asset, amount, status, reason, referenceId) {
    if (!(Number(amount) > 0)) return false;
    if (!sql) {
      if (memoryRewards.some((reward) => reward.referenceId === referenceId)) return false;
      memoryRewards.push({ accountId, asset, amount: Number(amount), status, reason, referenceId, createdAt: new Date().toISOString() });
      return true;
    }
    await ensureTables();
    const rows = await sql`
      INSERT INTO edg_referral_reward_ledger (id, account_id, asset, amount, status, reason, reference_id)
      VALUES (${crypto.randomUUID()}, ${accountId}, ${asset}, ${amount}, ${status}, ${reason}, ${referenceId})
      ON CONFLICT (reference_id) DO NOTHING RETURNING id
    `;
    return rows.length > 0;
  }

  async function bootstrap(clerkUserId, rawReferralCode) {
    if (!clerkUserId) throw new Error('Authenticated user identifier is required.');
    let profile = await findByClerkUserId(clerkUserId);
    if (!profile) {
      const accountId = crypto.randomUUID();
      let referralCode = createReferralCode();
      if (!sql) {
        while (memoryByCode.has(referralCode)) referralCode = createReferralCode();
        profile = { account_id: accountId, clerk_user_id: clerkUserId, referral_code: referralCode, referred_by: null, wallet_address: null, created_at: new Date().toISOString() };
        memoryProfiles.set(clerkUserId, profile);
        memoryByCode.set(referralCode, profile);
      } else {
        await ensureTables();
        const rows = await sql`
          INSERT INTO edg_user_profiles (account_id, clerk_user_id, referral_code)
          VALUES (${accountId}, ${clerkUserId}, ${referralCode})
          ON CONFLICT (clerk_user_id) DO UPDATE SET updated_at = NOW()
          RETURNING account_id, clerk_user_id, referral_code, referred_by, wallet_address, created_at
        `;
        profile = rows[0];
      }
    }

    const referralCode = normalizeReferralCode(rawReferralCode);
    if (!profile.referred_by && referralCode && referralCode !== profile.referral_code) {
      const referrer = await findByReferralCode(referralCode);
      if (referrer && String(referrer.account_id) !== String(profile.account_id)) {
        if (!sql) {
          profile.referred_by = referrer.account_id;
          memoryReferrals.set(String(profile.account_id), {
            id: crypto.randomUUID(), referrerId: referrer.account_id, referredId: profile.account_id, status: 'registered', createdAt: new Date().toISOString(),
          });
        } else {
          await sql`UPDATE edg_user_profiles SET referred_by = ${referrer.account_id}, updated_at = NOW() WHERE account_id = ${profile.account_id} AND referred_by IS NULL`;
          await sql`
            INSERT INTO edg_referrals (id, referrer_id, referred_id, status)
            VALUES (${crypto.randomUUID()}, ${referrer.account_id}, ${profile.account_id}, 'registered')
            ON CONFLICT (referred_id) DO NOTHING
          `;
          profile = await findByClerkUserId(clerkUserId);
        }
      }
    }
    return profile;
  }

  async function summary(accountId) {
    if (!sql) {
      const referrals = [...memoryReferrals.values()].filter((item) => String(item.referrerId) === String(accountId));
      const rewards = memoryRewards.filter((item) => String(item.accountId) === String(accountId));
      return {
        referrals: { total: referrals.length, qualified: referrals.filter((item) => item.status === 'qualified').length },
        rewards: rewards.reduce((result, reward) => {
          const key = `${reward.asset.toLowerCase()}${reward.status === 'pending' ? 'Pending' : 'Earned'}`;
          result[key] = (result[key] || 0) + Number(reward.amount);
          return result;
        }, {}),
      };
    }
    await ensureTables();
    const [referralRows, rewardRows] = await Promise.all([
      sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'qualified')::int AS qualified FROM edg_referrals WHERE referrer_id = ${accountId}`,
      sql`SELECT asset, status, COALESCE(SUM(amount), 0)::text AS amount FROM edg_referral_reward_ledger WHERE account_id = ${accountId} GROUP BY asset, status`,
    ]);
    const rewards = {};
    rewardRows.forEach((reward) => {
      const key = `${String(reward.asset).toLowerCase()}${reward.status === 'pending' ? 'Pending' : 'Earned'}`;
      rewards[key] = Number(reward.amount || 0);
    });
    return { referrals: { total: Number(referralRows[0]?.total || 0), qualified: Number(referralRows[0]?.qualified || 0) }, rewards };
  }

  async function activateReferral(referredAccountId) {
    let referral;
    if (!sql) {
      referral = memoryReferrals.get(String(referredAccountId));
      if (!referral || referral.status === 'qualified') return null;
      referral.status = 'qualified';
      referral.qualifiedAt = new Date().toISOString();
    } else {
      await ensureTables();
      const rows = await sql`
        UPDATE edg_referrals SET status = 'qualified', qualified_at = NOW()
        WHERE referred_id = ${referredAccountId} AND status = 'registered'
        RETURNING referrer_id, referred_id
      `;
      if (!rows[0]) return null;
      referral = { referrerId: rows[0].referrer_id, referredId: rows[0].referred_id };
    }
    const referrerId = referral.referrerId || referral.referrer_id;
    const referredId = referral.referredId || referral.referred_id;
    await insertReward(referrerId, 'CREDIT', referralCredits, 'earned', 'qualified_referral', `referral-credit:${referredId}`);
    await insertReward(referrerId, 'EDG', referralEdg, 'pending', 'qualified_referral', `referral-edg:${referredId}`);
    await insertReward(referrerId, 'BNB', referralBnb, 'pending', 'qualified_referral', `referral-bnb:${referredId}`);
    return { referrerId: String(referrerId), referredId: String(referredId), credits: referralCredits };
  }

  async function issueWalletChallenge(accountId, origin) {
    const nonce = crypto.randomBytes(18).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const message = [
      'EngineeringDrawing.io wallet verification',
      `Account: ${accountId}`,
      `Origin: ${origin}`,
      `Nonce: ${nonce}`,
      `Expires: ${expiresAt.toISOString()}`,
      'This signature links your public wallet address. It does not authorize a transaction.',
    ].join('\n');
    if (!sql) memoryChallenges.set(String(accountId), { nonce, message, expiresAt });
    else {
      await ensureTables();
      await sql`
        INSERT INTO edg_wallet_challenges (account_id, nonce, message, expires_at)
        VALUES (${accountId}, ${nonce}, ${message}, ${expiresAt.toISOString()})
        ON CONFLICT (account_id) DO UPDATE SET nonce = EXCLUDED.nonce, message = EXCLUDED.message, expires_at = EXCLUDED.expires_at, created_at = NOW()
      `;
    }
    return { message, expiresAt: expiresAt.toISOString() };
  }

  async function consumeWalletChallenge(accountId, address, signature, verifyMessage) {
    let challenge;
    if (!sql) challenge = memoryChallenges.get(String(accountId));
    else {
      await ensureTables();
      const rows = await sql`SELECT message, expires_at FROM edg_wallet_challenges WHERE account_id = ${accountId} LIMIT 1`;
      challenge = rows[0] || null;
    }
    if (!challenge || new Date(challenge.expiresAt || challenge.expires_at).getTime() <= Date.now()) return { ok: false, reason: 'Wallet challenge expired.' };
    let recoveredAddress;
    try { recoveredAddress = verifyMessage(challenge.message, signature); }
    catch { return { ok: false, reason: 'Wallet signature is invalid.' }; }
    if (String(address).toLowerCase() !== String(recoveredAddress).toLowerCase()) return { ok: false, reason: 'Wallet signature does not match this address.' };
    if (!sql) {
      memoryChallenges.delete(String(accountId));
      const profile = [...memoryProfiles.values()].find((item) => String(item.account_id) === String(accountId));
      if (profile) profile.wallet_address = address;
    } else {
      await sql`DELETE FROM edg_wallet_challenges WHERE account_id = ${accountId}`;
      await sql`UPDATE edg_user_profiles SET wallet_address = ${String(address).toLowerCase()}, updated_at = NOW() WHERE account_id = ${accountId}`;
    }
    return { ok: true };
  }

  return {
    activateReferral,
    bootstrap,
    consumeWalletChallenge,
    ensureTables,
    issueWalletChallenge,
    normalizeReferralCode,
    summary,
    policy: Object.freeze({
      welcomeCredits,
      qualifiedCredits: referralCredits,
      edgReward: referralEdg,
      bnbReward: referralBnb,
    }),
    welcomeCredits,
  };
}

module.exports = { createProfileService, normalizeReferralCode };
