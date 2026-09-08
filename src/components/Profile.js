import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrowserProvider, Contract, JsonRpcProvider, formatEther, formatUnits } from 'ethers';
import tokenMeta from '../EnggDrawTokenABI.json';
import { clearPendingReferralCode, pendingReferralCode, useEdgAuth } from '../auth/EdgAuth';
import { bootstrapProfile, createWalletChallenge, verifyWallet } from '../services/profile';
import './Profile.css';

const BSC_RPC = process.env.REACT_APP_BSC_RPC || 'https://bsc-dataseed.bnbchain.org';
const TOKEN_ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];
const emptyBalances = { bnb: '—', edg: '—' };

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not linked';
}

function formatBalance(value, maximumFractionDigits = 4) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits });
}

export default function Profile() {
  const auth = useEdgAuth();
  const { getToken, isSignedIn } = auth;
  const [data, setData] = useState(null);
  const [balances, setBalances] = useState(emptyBalances);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!isSignedIn) return;
    setLoading(true);
    setStatus('');
    try {
      const token = await getToken();
      const result = await bootstrapProfile(token, pendingReferralCode());
      clearPendingReferralCode();
      setData(result);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    const address = data?.profile?.walletAddress;
    if (!address) { setBalances(emptyBalances); return undefined; }
    let active = true;
    (async () => {
      try {
        const provider = new JsonRpcProvider(BSC_RPC);
        const token = new Contract(tokenMeta.ADDRESS, TOKEN_ABI, provider);
        const [bnb, edg, decimals] = await Promise.all([provider.getBalance(address), token.balanceOf(address), token.decimals()]);
        if (active) setBalances({ bnb: formatBalance(formatEther(bnb), 6), edg: formatBalance(formatUnits(edg, decimals), 2) });
      } catch {
        if (active) setBalances({ bnb: 'Unavailable', edg: 'Unavailable' });
      }
    })();
    return () => { active = false; };
  }, [data?.profile?.walletAddress]);

  const referralLink = useMemo(() => data?.profile?.referralCode ? `${window.location.origin}/?ref=${data.profile.referralCode}` : '', [data?.profile?.referralCode]);

  const shareReferral = async () => {
    if (!referralLink) return;
    const shareData = { title: 'Engineering Drawing', text: 'Build industrial engineering projects with EDG AI. Join with my referral link.', url: referralLink };
    try {
      if (navigator.share) await navigator.share(shareData);
      else { await navigator.clipboard.writeText(referralLink); setStatus('Referral link copied.'); }
    } catch (error) {
      if (error.name !== 'AbortError') setStatus('Could not share the link. Copy it manually below.');
    }
  };

  const linkWallet = async () => {
    if (!window.ethereum) return setStatus('Install MetaMask or open this page inside a compatible wallet browser.');
    setLoading(true);
    setStatus('Confirm the wallet link. No transaction or payment will be made.');
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const token = await auth.getToken();
      const challenge = await createWalletChallenge(token);
      const signature = await signer.signMessage(challenge.message);
      await verifyWallet(token, address, signature);
      setStatus('Wallet verified and linked.');
      await loadProfile();
    } catch (error) {
      setStatus(error.shortMessage || error.message || 'Wallet linking was cancelled.');
    } finally {
      setLoading(false);
    }
  };

  if (!auth.configured) return (
    <main className="profile-page">
      <section className="profile-auth-card"><span>ACCOUNT SETUP</span><h1>User profiles are ready for activation</h1><p>Add the Clerk production publishable and secret keys in Vercel to enable secure accounts, referrals, credits and linked wallets.</p></section>
    </main>
  );
  if (!auth.isLoaded) return <main className="profile-page"><p className="profile-loading">Loading secure account…</p></main>;
  if (!auth.isSignedIn) return (
    <main className="profile-page">
      <section className="profile-auth-card"><span>ENGINEERING DRAWING ACCOUNT</span><h1>Your engineering work, rewards and wallet in one place</h1><p>Sign in to save projects, protect purchases, collect AI credits and participate in the referral campaign.</p><button onClick={auth.signIn}>Sign in or create account</button></section>
    </main>
  );

  const name = auth.user?.fullName || auth.user?.firstName || 'Engineer';
  const rewards = data?.campaign?.rewards || {};
  const policy = data?.campaign?.policy || {};
  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div><span>ENGINEERING DRAWING PROFILE</span><h1>Welcome, {name}</h1><p>Manage engineering credits, wallet balances, referrals and purchases.</p></div>
        <button className="profile-signout" onClick={auth.signOut}>Sign out</button>
      </section>
      {status && <div className="profile-status" role="status">{status}</div>}
      <section className="balance-grid" aria-label="Account balances">
        <article><span>AI credits</span><strong>{data?.entitlement?.paidCredits ?? '—'}</strong><small>{data?.entitlement ? `${data.entitlement.freeRemaining} free uses remaining today` : 'Loading ledger'}</small></article>
        <article><span>BNB balance</span><strong>{balances.bnb}</strong><small>BNB Smart Chain</small></article>
        <article><span>EDG balance</span><strong>{balances.edg}</strong><small>Official EDG contract</small></article>
        <article><span>Linked wallet</span><strong className="wallet-address">{shortAddress(data?.profile?.walletAddress)}</strong><button onClick={linkWallet} disabled={loading}>{data?.profile?.walletAddress ? 'Verify another wallet' : 'Link wallet securely'}</button></article>
      </section>
      <section className="profile-columns">
        <article className="referral-card">
          <span>REFER & EARN</span><h2>Share Engineering Drawing</h2>
          <p>Your friend receives {policy.welcomeCredits ?? '—'} AI credits. You receive {policy.qualifiedCredits ?? '—'} AI credits after their first qualifying credit purchase.</p>
          <div className="referral-link"><input readOnly value={referralLink} aria-label="Your referral link"/><button onClick={shareReferral}>Share link</button></div>
          <div className="referral-stats"><div><strong>{data?.campaign?.referrals?.total || 0}</strong><small>Invited</small></div><div><strong>{data?.campaign?.referrals?.qualified || 0}</strong><small>Qualified</small></div><div><strong>{rewards.creditEarned || 0}</strong><small>Credits earned</small></div></div>
          <p className="campaign-note">EDG and BNB campaign rewards are tracked as pending only when the treasury campaign is enabled. No private keys are stored by this website.</p>
        </article>
        <article className="activity-card"><span>ACCOUNT ACTIVITY</span><h2>Reward balances</h2><dl><div><dt>EDG pending</dt><dd>{rewards.edgPending || 0}</dd></div><div><dt>BNB pending</dt><dd>{rewards.bnbPending || 0}</dd></div><div><dt>Member since</dt><dd>{data?.profile?.createdAt ? new Date(data.profile.createdAt).toLocaleDateString() : '—'}</dd></div></dl><Link to="/workspace">Open engineering workspace →</Link></article>
      </section>
    </main>
  );
}
