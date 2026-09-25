export const EDG_CHAIN_ID = '0x38';
export const EDG_BSC_RPC = process.env.REACT_APP_BSC_RPC || 'https://bsc-dataseed.bnbchain.org';

let clientPromise;
let connectedProvider;
let connectPromise;
const boundProviders = new WeakSet();
const ACCOUNT_KEY = 'edg-ecosystem-wallet-address';
const ACCOUNT_EVENT = 'edg:wallet-account';

function publishAccount(account = '') {
  const normalized = account ? String(account).toLowerCase() : '';
  try {
    if (normalized) window.localStorage.setItem(ACCOUNT_KEY, normalized);
    else window.localStorage.removeItem(ACCOUNT_KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent(ACCOUNT_EVENT, { detail: { account: normalized } }));
  return normalized;
}

function bindProviderEvents(provider) {
  if (!provider || boundProviders.has(provider) || typeof provider.on !== 'function') return;
  boundProviders.add(provider);
  provider.on('accountsChanged', (accounts) => publishAccount(accounts?.[0] || ''));
  provider.on('disconnect', () => publishAccount(''));
  provider.on('chainChanged', (chainId) => {
    if (String(chainId).toLowerCase() !== EDG_CHAIN_ID) publishAccount('');
  });
}

async function createClient() {
  const { createEVMClient } = await import('@metamask/connect-evm');
  return createEVMClient({
    dapp: {
      name: 'EDG Ecosystem',
      url: window.location.origin,
      iconUrl: `${window.location.origin}/assets/edg-192.png`,
    },
    api: { supportedNetworks: { [EDG_CHAIN_ID]: EDG_BSC_RPC } },
    mobile: { useDeeplink: true },
  });
}

function injectedMetaMaskProvider() {
  const ethereum = typeof window !== 'undefined' ? window.ethereum : null;
  if (!ethereum) return null;
  if (Array.isArray(ethereum.providers)) return ethereum.providers.find((provider) => provider?.isMetaMask) || null;
  return ethereum.isMetaMask ? ethereum : null;
}

export function preloadEdgWallet() {
  return getEdgWalletClient().catch(() => null);
}

export async function getEdgWalletClient() {
  if (!clientPromise) clientPromise = createClient().catch((error) => {
    clientPromise = undefined;
    throw error;
  });
  return clientPromise;
}

export async function ensureEdgChain(provider) {
  const current = await provider.request({ method: 'eth_chainId' });
  if (String(current).toLowerCase() === EDG_CHAIN_ID) return;
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: EDG_CHAIN_ID }] });
  } catch (error) {
    if (error?.code !== 4902) throw error;
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: EDG_CHAIN_ID,
        chainName: 'BNB Smart Chain',
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
        rpcUrls: [EDG_BSC_RPC],
        blockExplorerUrls: ['https://bscscan.com'],
      }],
    });
  }
}

export async function connectEdgWallet() {
  if (connectPromise) return connectPromise;
  connectPromise = (async () => {
    const injected = injectedMetaMaskProvider();
    if (injected) {
      connectedProvider = injected;
      bindProviderEvents(injected);
      let accounts = await injected.request({ method: 'eth_accounts' });
      if (!accounts?.[0]) accounts = await injected.request({ method: 'eth_requestAccounts' });
      await ensureEdgChain(injected);
      if (!accounts?.[0]) throw new Error('No MetaMask account was selected.');
      publishAccount(accounts[0]);
      try { window.sessionStorage.removeItem('edg-presale-manually-disconnected'); } catch {}
      return { client: null, provider: injected, accounts, account: accounts[0] };
    }

    const client = await getEdgWalletClient();
    let reusableProvider = connectedProvider;
    if (!reusableProvider) {
      try { reusableProvider = client.getProvider(); } catch {}
    }
    if (reusableProvider) {
      try {
        const [accounts, chainId] = await Promise.all([
          reusableProvider.request({ method: 'eth_accounts' }),
          reusableProvider.request({ method: 'eth_chainId' }),
        ]);
        if (accounts?.[0] && String(chainId).toLowerCase() === EDG_CHAIN_ID) {
          connectedProvider = reusableProvider;
          bindProviderEvents(reusableProvider);
          publishAccount(accounts[0]);
          return { client, provider: reusableProvider, accounts, account: accounts[0] };
        }
      } catch {}
    }

    const session = await client.connect({ chainIds: [EDG_CHAIN_ID] });
    connectedProvider = client.getProvider();
    bindProviderEvents(connectedProvider);
    await ensureEdgChain(connectedProvider);
    const accounts = session.accounts?.length
      ? session.accounts
      : await connectedProvider.request({ method: 'eth_accounts' });
    if (!accounts?.[0]) throw new Error('No MetaMask account was selected.');
    publishAccount(accounts[0]);
    try { window.sessionStorage.removeItem('edg-presale-manually-disconnected'); } catch {}
    return { client, provider: connectedProvider, accounts, account: accounts[0] };
  })();
  try {
    return await connectPromise;
  } finally {
    connectPromise = undefined;
  }
}

export async function restoreEdgWallet() {
  const injected = injectedMetaMaskProvider();
  if (injected) {
    const [accounts, chainId] = await Promise.all([
      injected.request({ method: 'eth_accounts' }),
      injected.request({ method: 'eth_chainId' }),
    ]);
    if (!accounts?.[0] || String(chainId).toLowerCase() !== EDG_CHAIN_ID) { publishAccount(''); return null; }
    connectedProvider = injected;
    bindProviderEvents(injected);
    publishAccount(accounts[0]);
    return { client: null, provider: injected, accounts, account: accounts[0] };
  }
  const client = await getEdgWalletClient();
  const provider = connectedProvider || client.getProvider();
  if (!provider) { publishAccount(''); return null; }
  const [accounts, chainId] = await Promise.all([
    provider.request({ method: 'eth_accounts' }),
    provider.request({ method: 'eth_chainId' }),
  ]);
  if (!accounts?.[0] || String(chainId).toLowerCase() !== EDG_CHAIN_ID) {
    publishAccount('');
    return null;
  }
  connectedProvider = provider;
  bindProviderEvents(provider);
  publishAccount(accounts[0]);
  return { client, provider, accounts, account: accounts[0] };
}

export async function switchEdgWallet() {
  const injected = injectedMetaMaskProvider();
  if (injected) {
    connectedProvider = injected;
    bindProviderEvents(injected);
    await injected.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
    const accounts = await injected.request({ method: 'eth_requestAccounts' });
    await ensureEdgChain(injected);
    if (!accounts?.[0]) throw new Error('No MetaMask account was selected.');
    publishAccount(accounts[0]);
    try { window.sessionStorage.removeItem('edg-presale-manually-disconnected'); } catch {}
    return { client: null, provider: injected, accounts, account: accounts[0] };
  }
  const client = await getEdgWalletClient();
  const provider = connectedProvider || client.getProvider();
  if (!provider) return connectEdgWallet();
  connectedProvider = provider;
  bindProviderEvents(provider);
  await provider.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  await ensureEdgChain(provider);
  if (!accounts?.[0]) throw new Error('No MetaMask account was selected.');
  publishAccount(accounts[0]);
  try { window.sessionStorage.removeItem('edg-presale-manually-disconnected'); } catch {}
  return { client, provider, accounts, account: accounts[0] };
}

export async function disconnectEdgWallet() {
  const injected = injectedMetaMaskProvider();
  const client = injected ? null : await getEdgWalletClient();
  try { if (client) await client.disconnect(); } finally {
    connectedProvider = undefined;
    publishAccount('');
    try { window.sessionStorage.setItem('edg-presale-manually-disconnected', 'true'); } catch {}
  }
}

if (typeof window !== 'undefined') {
  const warm = () => { if (!injectedMetaMaskProvider()) preloadEdgWallet(); };
  if ('requestIdleCallback' in window) window.requestIdleCallback(warm, { timeout: 1500 });
  else window.setTimeout(warm, 300);
}

export function currentEdgWalletProvider() {
  return connectedProvider;
}

export function savedEdgWalletAccount() {
  try { return window.localStorage.getItem(ACCOUNT_KEY) || ''; } catch { return ''; }
}

export function watchEdgWallet(listener) {
  const handler = (event) => listener(event.detail?.account || '');
  window.addEventListener(ACCOUNT_EVENT, handler);
  return () => window.removeEventListener(ACCOUNT_EVENT, handler);
}
