export const EDG_CHAIN_ID = '0x38';
export const EDG_BSC_RPC = process.env.REACT_APP_BSC_RPC || 'https://bsc-dataseed.bnbchain.org';

let clientPromise;
let connectedProvider;

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
  await ensureEdgChain(connectedProvider);
  const accounts = session.accounts?.length
    ? session.accounts
    : await connectedProvider.request({ method: 'eth_accounts' });
  if (!accounts?.[0]) throw new Error('No MetaMask account was selected.');
  return { client, provider: connectedProvider, accounts, account: accounts[0] };
}

export async function restoreEdgWallet() {
  const client = await getEdgWalletClient();
  const provider = connectedProvider || client.getProvider();
  const accounts = await provider.request({ method: 'eth_accounts' });
  if (!accounts?.[0]) return null;
  connectedProvider = provider;
  return { client, provider, accounts, account: accounts[0] };
}

export function currentEdgWalletProvider() {
  return connectedProvider;
}
