import { useEffect } from 'react';
import { savedEdgWalletAccount, watchEdgWallet } from './edgWallet';
import { getProductEntitlement } from './commerce';

export default function useProductEntitlement(productId, setStatus) {
  useEffect(() => {
    let active = true;
    const restore = async (walletAddress) => {
      if (!walletAddress) return;
      try {
        const result = await getProductEntitlement(productId, walletAddress);
        if (active && result.entitled) setStatus('paid');
      } catch {
        // A failed lookup must never grant access; checkout remains available.
      }
    };
    restore(savedEdgWalletAccount());
    const unwatch = watchEdgWallet((account) => restore(account));
    return () => { active = false; unwatch(); };
  }, [productId, setStatus]);
}
