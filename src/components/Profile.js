import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrowserProvider, Contract, JsonRpcProvider, formatEther, formatUnits } from 'ethers';
import tokenMeta from '../EnggDrawTokenABI.json';
import { clearPendingReferralCode, pendingReferralCode, useEdgAuth } from '../auth/EdgAuth';
import { bootstrapProfile, createWalletChallenge, verifyWallet } from '../services/profile';
import { buyAiCredits } from '../services/edgAi';
import './Profile.css';

const BSC_RPC = process.env.REACT_APP_BSC_RPC || 'https://bsc-dataseed.bnbchain.org';
const WC_PROJECT_ID = process.env.REACT_APP_WC_PROJECT_ID || '';
const TOKEN_ABI = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'];
const emptyBalances = { bnb: '—', edg: '—' };

function injectedWallet(kind) {
  const ethereum = window.ethereum;
  if (!ethereum) return null;
  const providers = ethereum.providers || [ethereum];
  if (kind === 'metamask') return providers.find((provider) => provider.isMetaMask) || null;
  if (kind === 'coinbase') return providers.find((provider) => provider.isCoinbaseWallet) || null;
  return providers[0] || ethereum;
}

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not linked';
}

function formatBalance(value, maximumFractionDigits = 4) {
  return Number(value).toLocaleString(undefined, { maximumFractionDigits });
}

function AuthProviderIcon({ provider }) {
  if (provider === 'google') return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.3c1.9-1.8 3-4.4 3-7.6Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.8-2.3l-3.3-2.6c-.9.6-2.1 1-3.5 1a6 6 0 0 1-5.6-4.1H3v2.7A10.3 10.3 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 14a6.2 6.2 0 0 1 0-4V7.3H3a10.1 10.1 0 0 0 0 9.4L6.4 14Z"/><path fill="#EA4335" d="M12 5.9c1.6 0 3 .5 4.1 1.6l3.1-3.1A10.2 10.2 0 0 0 3 7.3L6.4 10A6 6 0 0 1 12 5.9Z"/></svg>;
  if (provider === 'github') return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .7a11.5 11.5 0 0 0-3.6 22.4c.6.1.8-.2.8-.5v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.8.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2A11.4 11.4 0 0 1 12 6.7c1 0 2 .1 3 .4 2.2-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.2c0 .3.2.6.8.5A11.5 11.5 0 0 0 12 .7Z"/></svg>;
  return null;
}

export default function Profile() {
  const auth = useEdgAuth();
  const { getToken, isSignedIn } = auth;
  const [data, setData] = useState(null);
  const [balances, setBalances] = useState(emptyBalances);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [walletMethod, setWalletMethod] = useState('metamask');
  const walletConnectRef = useRef(null);

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
    setLoading(true);
    setStatus('Choose your wallet account, then sign the verification message. No payment will be made.');
    try {
      let eip1193;
      if (walletMethod === 'walletconnect') {
        if (!WC_PROJECT_ID) throw new Error('WalletConnect is not configured for this environment.');
        const module = await import('@walletconnect/ethereum-provider');
        const EthereumProvider = module.default || module.EthereumProvider;
        eip1193 = await EthereumProvider.init({
          projectId: WC_PROJECT_ID,
          chains: [56],
          rpcMap: { 56: BSC_RPC },
          showQrModal: true,
          methods: ['eth_accounts', 'eth_requestAccounts', 'personal_sign'],
          events: ['accountsChanged', 'chainChanged', 'disconnect'],
          metadata: {
            name: 'Engineering Drawing',
            description: 'Securely link a wallet to your Engineering Drawing account',
            url: window.location.origin,
            icons: [`${window.location.origin}/assets/edg_logo.svg`],
          },
        });
        walletConnectRef.current = eip1193;
        await eip1193.enable();
      } else {
        eip1193 = injectedWallet(walletMethod);
        if (!eip1193) {
          const walletName = walletMethod === 'coinbase' ? 'Coinbase Wallet' : 'MetaMask';
          throw new Error(`${walletName} was not detected. Install it or choose WalletConnect.`);
        }
        await eip1193.request({ method: 'eth_requestAccounts' });
      }
      const provider = new BrowserProvider(eip1193);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const token = await auth.getToken();
      const challenge = await createWalletChallenge(token);
      const signature = await signer.signMessage(challenge.message);
      await verifyWallet(token, address, signature);
      setStatus('Wallet ownership verified. Your BNB and EDG balances are now connected to this account.');
      await loadProfile();
    } catch (error) {
      setStatus(error.shortMessage || error.message || 'Wallet linking was cancelled.');
    } finally {
      setLoading(false);
    }
  };

  const addAiFunds = async () => {
    setCheckoutLoading(true);
    setStatus('Opening secure crypto checkout…');
    try {
      await buyAiCredits({ accountId: auth.accountId, authToken: await auth.getToken() });
    } catch (error) {
      setCheckoutLoading(false);
      setStatus(error.message || 'Could not open checkout. Please try again.');
    }
  };

  const continueWithGoogle = async () => {
    setStatus('Opening Google secure sign-in…');
    try {
      await auth.signInWithGoogle();
    } catch (error) {
      setStatus(error.message || 'Google sign-in is awaiting production activation. Choose a verified email instead.');
      auth.signIn();
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
      <section className="profile-auth-card"><span>ENGINEERING DRAWING ACCOUNT</span><h1>One secure account for every engineering project</h1><p>Sign in to save designs, manage AI credits and connect your Web3 wallet.</p><div className="account-steps"><div><b>1</b><span><strong>Sign in securely</strong><small>Google, GitHub or verified email</small></span></div><div><b>2</b><span><strong>Connect Web3 wallet</strong><small>MetaMask, Coinbase or WalletConnect</small></span></div></div><div className="signin-actions"><button className="google-signin" onClick={continueWithGoogle}><AuthProviderIcon provider="google"/><span>Continue with Google</span></button><button className="other-signin" onClick={auth.signIn}><AuthProviderIcon provider="github"/><span>GitHub or email sign-in</span></button></div>{status && <div className="profile-status" role="status">{status}</div>}<small>Authentication is handled by Clerk. Engineering Drawing never receives your Google password. Wallet connection is a separate, non-custodial step.</small></section>
    </main>
  );

  const name = auth.user?.fullName || auth.user?.firstName || 'Engineer';
  const rewards = data?.campaign?.rewards || {};
  const policy = data?.campaign?.policy || {};
  return (
    <main className="profile-page">
      <section className="profile-hero">
        <div><span>ENGINEERING DRAWING PROFILE</span><h1>Welcome, {name}</h1><p>Manage engineering credits, wallet balances, security, referrals and purchases.</p></div>
        <div className="profile-hero-actions"><button className="profile-security" onClick={auth.manageAccount}>Security & sign-in</button><button className="profile-signout" onClick={auth.signOut}>Sign out</button></div>
      </section>
      {status && <div className="profile-status" role="status">{status}</div>}
      <section className="balance-grid" aria-label="Account balances">
        <article><span>AI credits</span><strong>{data?.entitlement?.paidCredits ?? '—'}</strong><small>{data?.entitlement ? `${data.entitlement.freeRemaining} free uses remaining today` : 'Loading ledger'}</small><button onClick={addAiFunds} disabled={checkoutLoading || !auth.accountId}>{checkoutLoading ? 'Opening…' : 'Add 100 credits · $19'}</button></article>
        <article><span>BNB balance</span><strong>{balances.bnb}</strong><small>BNB Smart Chain</small></article>
        <article><span>EDG balance</span><strong>{balances.edg}</strong><small>Official EDG contract</small></article>
        <article><span>Linked wallet</span><strong className="wallet-address">{shortAddress(data?.profile?.walletAddress)}</strong><small>{data?.profile?.walletAddress ? 'Ownership verified' : 'No wallet connected'}</small></article>
      </section>
      <section className="wallet-connect-card" aria-labelledby="wallet-connect-title">
        <div className="wallet-connect-copy"><span>CONNECTED WALLETS</span><h2 id="wallet-connect-title">Connect your Web3 wallet</h2><p>Choose a provider and sign a short-lived verification message. This does not send a transaction, approve token spending, or give Engineering Drawing access to your funds.</p></div>
        <div className="wallet-provider-panel">
          <div className="wallet-provider-grid" role="group" aria-label="Wallet provider">
            <button className={walletMethod === 'metamask' ? 'active' : ''} onClick={() => setWalletMethod('metamask')}><b>MetaMask</b><small>Browser or mobile app</small></button>
            <button className={walletMethod === 'coinbase' ? 'active' : ''} onClick={() => setWalletMethod('coinbase')}><b>Coinbase Wallet</b><small>Extension wallet</small></button>
            <button className={walletMethod === 'walletconnect' ? 'active' : ''} onClick={() => setWalletMethod('walletconnect')}><b>WalletConnect</b><small>QR · Trust Wallet & more</small></button>
          </div>
          <button className="wallet-connect-action" onClick={linkWallet} disabled={loading}>{loading ? 'Waiting for wallet…' : data?.profile?.walletAddress ? 'Verify and replace linked wallet' : 'Connect and verify wallet'}</button>
          <div className="wallet-safety"><span>✓ No private keys</span><span>✓ No token approval</span><span>✓ BNB Smart Chain balances</span></div>
        </div>
      </section>
      <section className="profile-columns">
        <article className="referral-card">
          <span>REFER & EARN</span><h2>Share Engineering Drawing</h2>
          <p>Your friend receives {policy.welcomeCredits ?? '—'} AI credits. You receive {policy.qualifiedCredits ?? '—'} AI credits after their first qualifying credit purchase.</p>
          <div className="referral-link"><input readOnly value={referralLink} aria-label="Your referral link"/><button onClick={shareReferral}>Share link</button></div>
          <div className="referral-stats"><div><strong>{data?.campaign?.referrals?.total || 0}</strong><small>Invited</small></div><div><strong>{data?.campaign?.referrals?.qualified || 0}</strong><small>Qualified</small></div><div><strong>{rewards.creditEarned || 0}</strong><small>Credits earned</small></div></div>
          <p className="campaign-note">EDG and BNB campaign rewards are tracked as pending only when the treasury campaign is enabled. No private keys are stored by this website.</p>
        </article>
        <article className="activity-card"><span>ACCOUNT & SECURITY</span><h2>Protected engineering account</h2><dl><div><dt>EDG rewards pending</dt><dd>{rewards.edgPending || 0}</dd></div><div><dt>BNB rewards pending</dt><dd>{rewards.bnbPending || 0}</dd></div><div><dt>Member since</dt><dd>{data?.profile?.createdAt ? new Date(data.profile.createdAt).toLocaleDateString() : '—'}</dd></div></dl><button className="security-action" onClick={auth.manageAccount}>Manage sign-in methods</button><p className="security-note">Email verification protects sign-in today. Authenticator 2FA and backup codes can be enabled after the identity security plan upgrade. Your linked wallet remains non-custodial.</p><Link to="/workspace">Open engineering workspace →</Link></article>
      </section>
    </main>
  );
}
