export const EDG_CHAIN_ID = '0x38';
export const EDG_BSC_RPC = process.env.REACT_APP_BSC_RPC || 'https://bsc-dataseed.bnbchain.org';

let clientPromise;
let connectedProvider;
let providerEventsBound = false;
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
  if (providerEventsBound || typeof provider?.on !== 'function') return;
  providerEventsBound = true;
  provider.on('accountsChanged', (accounts) => publishAccount(accounts?.[0] || ''));
  provider.on('disconnect', () => publishAccount(''));
}

async function createClient() {
  const { createEVMClient } = await import('@metamask/connect-evm');
  return createEVMClient({
    dapp: {
      name: 'EDG Ecosystem',
      url: window.location.href,
      iconUrl: `${window.location.origin}/assets/edg-192.png`,
    },
    api: { supportedNetworks: { [EDG_CHAIN_ID]: EDG_BSC_RPC } },
  });
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
  const client = await getEdgWalletClient();
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
}

export async function restoreEdgWallet() {
  const client = await getEdgWalletClient();
  const provider = connectedProvider || client.getProvider();
  const accounts = await provider.request({ method: 'eth_accounts' });
  if (!accounts?.[0]) return null;
  connectedProvider = provider;
  bindProviderEvents(provider);
  publishAccount(accounts[0]);
  return { client, provider, accounts, account: accounts[0] };
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
