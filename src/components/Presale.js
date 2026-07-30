import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  BrowserProvider,
  FallbackProvider,
  JsonRpcProvider,
  Contract,
  formatUnits,
  parseUnits,
  parseEther,
} from "ethers";
import presaleMeta from "../EDGPresaleABI.json";
import tokenMeta   from "../EnggDrawTokenABI.json";
import "./Presale.css";

/* ========= NETWORK ========= */
const CHAIN_ID_DEC = 56;                 // BSC mainnet
const CHAIN_ID_HEX = "0x38";
const READ_RPCS = [
  process.env.REACT_APP_BSC_RPC,
  "https://bsc-dataseed.bnbchain.org",
  "https://bsc-dataseed-public.bnbchain.org",
].filter(Boolean);
const READ_RPC = READ_RPCS[0];
const EXPLORER     = "https://bscscan.com/address/";
const BSC_GAS_RESERVE_WEI = parseEther("0.0003");

/* ========= ADDRS/ABIs ========= */
const FALLBACK_PRESALE = "0x944483c8083827A8BF09c12cFC57DB6a5b22697A";
const FALLBACK_TOKEN   = "0xa90Cc0137FDA4285Eaa6da0f7a5118A1432b2a76";

const PRESALE_ADDRESS = presaleMeta.ADDRESS || presaleMeta.address || FALLBACK_PRESALE;
const PRESALE_ABI     = presaleMeta.ABI      || presaleMeta.abi;
const TOKEN_ADDRESS   = tokenMeta.ADDRESS    || tokenMeta.address || FALLBACK_TOKEN;
const TOKEN_ABI       = tokenMeta.ABI        || tokenMeta.abi;

/* ========= MOBILE / WC ========= */
const WC_PROJECT_ID = process.env.REACT_APP_WC_PROJECT_ID || ""; // optional
const isMobileDevice = () =>
  typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const getInjectedProvider = () => {
  if (typeof window === "undefined" || !window.ethereum) return null;
  const providers = window.ethereum.providers;
  return providers?.find((provider) => provider.isMetaMask) || window.ethereum;
};

// Kept as values for any hot-reloaded code that still uses the original names.
const isMobileUA = isMobileDevice();
const hasInjectedWallet = Boolean(getInjectedProvider());

const fmtInt = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmt = (n, d = 2) =>
  Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: d });
const short = (addr) => (addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "");
const PENDING_PURCHASE_KEY = "edg-presale-pending-purchase";
const MANUAL_DISCONNECT_KEY = "edg-presale-manually-disconnected";

function readPendingPurchase() {
  if (typeof window === "undefined") return null;
  try {
    const pending = JSON.parse(window.sessionStorage.getItem(PENDING_PURCHASE_KEY) || "null");
    // A stale record should never leave a later visitor in a pending state.
    return pending?.account && Date.now() - Number(pending.startedAt || 0) < 30 * 60 * 1000
      ? pending
      : null;
  } catch {
    return null;
  }
}

function wasManuallyDisconnected() {
  try { return window.sessionStorage.getItem(MANUAL_DISCONNECT_KEY) === "true"; } catch { return false; }
}

/* ========= HELPERS ========= */
async function ensureChain(eip1193) {
  const currentChainId = await eip1193.request({ method: "eth_chainId" });
  if (String(currentChainId).toLowerCase() === CHAIN_ID_HEX) return;

  try {
    await eip1193.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
  } catch (e) {
    if (e?.code === 4902) {
      await eip1193.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CHAIN_ID_HEX,
          chainName: "BNB Smart Chain",
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          rpcUrls: [READ_RPC],
          blockExplorerUrls: ["https://bscscan.com/"],
        }],
      });
      await eip1193.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
    } else {
      throw e;
    }
  }

  const chainId = await eip1193.request({ method: "eth_chainId" });
  if (String(chainId).toLowerCase() !== CHAIN_ID_HEX) {
    throw new Error("Please switch your wallet to BNB Smart Chain before continuing.");
  }
}

function openMetaMaskDeepLink() {
  const dappUrl = `${window.location.origin}/presale`;
  window.location.assign(`https://metamask.app.link/dapp/${dappUrl}`);
}

function walletErrorMessage(error, fallback = "The wallet request could not be completed.") {
  const message = String(
    error?.shortMessage ||
    error?.info?.error?.message ||
    error?.data?.message ||
    error?.reason ||
    error?.message ||
    fallback
  );

  if (/user rejected|user denied|rejected the request|\b4001\b/i.test(message)) {
    return "The request was cancelled in your wallet.";
  }
  if (/insufficient funds/i.test(message)) {
    return "Your wallet does not have enough BNB to cover this purchase and its network fee.";
  }
  if (/below min/i.test(message)) {
    return "This purchase is below the presale minimum.";
  }
  if (/over max|limits/i.test(message)) {
    return "This purchase exceeds the wallet purchase limit.";
  }
  if (/stage cap/i.test(message)) {
    return "There are not enough tokens left in the current presale stage for this purchase.";
  }
  if (/paused/i.test(message)) {
    return "The presale is currently paused.";
  }
  if (/network|chain/i.test(message) && /switch|56|bnb/i.test(message)) {
    return "Please switch your wallet to BNB Smart Chain and try again.";
  }
  return message || fallback;
}

/* ========= COMPONENT ========= */
export default function Presale() {
  const [signer, setSigner]     = useState(null);
  const [account, setAccount]   = useState(null);
  const [usingWC, setUsingWC]   = useState(false); // UI hint
  const wcRef = useRef(null); // keep WalletConnect provider to cleanly disconnect
  const metaMaskConnectRef = useRef(null);
  const walletProviderRef = useRef(null);
  const walletListenersRef = useRef(null);

  // Public BSC RPC nodes can be briefly out of sync. Use the first healthy
  // response as a failover, rather than requiring two RPCs to agree and
  // showing buyers the ethers "quorum not met" technical error.
  const readProv = useMemo(() => new FallbackProvider(
    READ_RPCS.map((rpc, index) => ({
      provider: new JsonRpcProvider(rpc, CHAIN_ID_DEC, { staticNetwork: true, batchMaxCount: 1 }),
      priority: index,
      stallTimeout: 1_500,
      weight: 1,
    })),
    CHAIN_ID_DEC,
    { quorum: 1, cacheTimeout: 1_000 }
  ), []);

  /* on-chain state */
  const [decimals, setDecimals]             = useState(18);
  const [owner, setOwner]                   = useState("");
  const [paused, setPaused]                 = useState(true);
  const [stage, setStage]                   = useState(0);
  const [stagesTotal, setStagesTotal]       = useState(3);
  const [stageCaps, setStageCaps]           = useState([0n,0n,0n]);
  const [stageSold, setStageSold]           = useState([0n,0n,0n]);
  const [stageRemain, setStageRemain]       = useState([0n,0n,0n]);
  const [stagePricesUsd, setStagePricesUsd] = useState([0n,0n,0n]);
  const [bnbUsd1e18, setBnbUsd1e18]         = useState(0n);
  const [minPerWallet, setMinPerWallet]     = useState(0n);
  const [maxPerWallet, setMaxPerWallet]     = useState(0n);
  const [yourPurchased, setYourPurchased]   = useState(0n);
  const [tokensSold, setTokensSold]         = useState(0n);
  const [priceMode, setPriceMode]           = useState(0);

  /* ui */
  const [bnbIn, setBnbIn]           = useState("0.01");
  const [estStage, setEstStage]     = useState(null);
  const [estTokens, setEstTokens]   = useState(0n);
  const [busy, setBusy]             = useState("");
  const [err, setErr]               = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [refreshIn, setRefreshIn]   = useState(60);
  const [codeOk, setCodeOk]         = useState(true);
  const [dataReady, setDataReady]   = useState(false);
  const [txHash, setTxHash]         = useState("");
  const [purchaseComplete, setPurchaseComplete] = useState(null);
  const [nativeBalance, setNativeBalance] = useState(0n);
  const [pendingPurchase, setPendingPurchase] = useState(readPendingPurchase);
  const purchaseRecoveredRef = useRef(false);

  /* contracts (read+write) */
  const presaleRead = useMemo(() => new Contract(PRESALE_ADDRESS, PRESALE_ABI, readProv), [readProv]);
  const tokenRead   = useMemo(() => new Contract(TOKEN_ADDRESS,   TOKEN_ABI,   readProv), [readProv]);
  const presaleWrite= useMemo(() => (signer ? new Contract(PRESALE_ADDRESS, PRESALE_ABI, signer) : null), [signer]);

  const savePendingPurchase = useCallback((pending) => {
    setPendingPurchase(pending);
    try { window.sessionStorage.setItem(PENDING_PURCHASE_KEY, JSON.stringify(pending)); } catch {}
  }, []);

  const clearPendingPurchase = useCallback(() => {
    setPendingPurchase(null);
    try { window.sessionStorage.removeItem(PENDING_PURCHASE_KEY); } catch {}
  }, []);

  const allowWalletReconnect = useCallback(() => {
    try { window.sessionStorage.removeItem(MANUAL_DISCONNECT_KEY); } catch {}
  }, []);

  const blockWalletReconnect = useCallback(() => {
    try { window.sessionStorage.setItem(MANUAL_DISCONNECT_KEY, "true"); } catch {}
  }, []);

  // The wallet, never the website, chooses which private account is used.
  // Re-create the signer whenever that selection changes so the transaction
  // and the address displayed on screen always match.
  const setActiveWalletAccount = useCallback(async (eip1193, selectedAccount) => {
    const provider = new BrowserProvider(eip1193, "any");
    const signer_ = selectedAccount
      ? await provider.getSigner(selectedAccount)
      : await provider.getSigner();
    const address = (await signer_.getAddress()).toLowerCase();
    setSigner(signer_);
    setAccount(address);
    return address;
  }, []);

  const clearWalletListeners = useCallback(() => {
    const listeners = walletListenersRef.current;
    if (listeners?.provider?.removeListener) {
      listeners.provider.removeListener("accountsChanged", listeners.accountsChanged);
      listeners.provider.removeListener("chainChanged", listeners.chainChanged);
      listeners.provider.removeListener("disconnect", listeners.disconnected);
    }
    walletListenersRef.current = null;
  }, []);

  const bindWalletEvents = useCallback((eip1193) => {
    clearWalletListeners();
    walletProviderRef.current = eip1193;
    if (typeof eip1193?.on !== "function") return;

    const accountsChanged = async (accounts) => {
      setErr("");
      setTxHash("");
      setPurchaseComplete(null);
      if (!accounts?.[0]) {
        setSigner(null);
        setAccount(null);
        setNativeBalance(0n);
        return;
      }
      try {
        await setActiveWalletAccount(eip1193, accounts[0]);
      } catch (error) {
        setErr(walletErrorMessage(error, "The selected wallet account could not be loaded."));
      }
    };
    const chainChanged = () => window.location.reload();
    const disconnected = () => {
      clearWalletListeners();
      walletProviderRef.current = null;
      setSigner(null);
      setAccount(null);
      setUsingWC(false);
      setNativeBalance(0n);
    };

    eip1193.on("accountsChanged", accountsChanged);
    eip1193.on("chainChanged", chainChanged);
    eip1193.on("disconnect", disconnected);
    walletListenersRef.current = { provider: eip1193, accountsChanged, chainChanged, disconnected };
  }, [clearWalletListeners, setActiveWalletAccount]);

  /* ========= CONNECT (smart, mobile-aware) ========= */
  const connect = useCallback(async (forceWalletConnect = false) => {
    const useWalletConnect = forceWalletConnect === true;
    setErr("");
    setBusy("Connecting wallet...");
    try {
      // 1) Injected (desktop or MetaMask in-app)
      const injectedProvider = getInjectedProvider();
      if (injectedProvider && !useWalletConnect) {
        // Mobile MetaMask must approve account access before it can reliably
        // process a network-switch request. Reversing these calls can leave
        // its "Connecting to MetaMask" sheet spinning indefinitely.
        const accounts = await injectedProvider.request({ method: "eth_requestAccounts" });
        await ensureChain(injectedProvider);
        await setActiveWalletAccount(injectedProvider, accounts?.[0]);
        bindWalletEvents(injectedProvider);
        allowWalletReconnect();
        setUsingWC(false);
        return;
      }

      // 2) No injected provider — mobile path
      // WalletConnect works on desktop (QR scan) and mobile (wallet app).
      // It is deliberately available even when a browser wallet is not installed.
      if (useWalletConnect || isMobileDevice()) {
        if (WC_PROJECT_ID) {
          // WalletConnect v2
          const mod = await import("@walletconnect/ethereum-provider");
          const EthereumProvider = mod?.default || mod?.EthereumProvider;
          const wc = await EthereumProvider.init({
            projectId: WC_PROJECT_ID,
            chains: [CHAIN_ID_DEC],
            rpcMap: { [CHAIN_ID_DEC]: READ_RPC },
            showQrModal: true,
            methods: [
              "eth_accounts", "eth_requestAccounts", "eth_sendTransaction", "eth_signTransaction",
              "eth_sign", "personal_sign", "eth_signTypedData", "eth_signTypedData_v3",
              "eth_signTypedData_v4", "wallet_switchEthereumChain", "wallet_addEthereumChain",
              "wallet_watchAsset"
            ],
            events: ["chainChanged", "accountsChanged", "disconnect"],
            metadata: {
              name: "Engineering Drawing — EDG Presale",
              description: "EDG Presale on BSC Mainnet",
              url: window.location.origin,
              icons: ["https://www.engineeringdrawing.io/assets/edg_logo.svg"]
            }
          });
          wcRef.current = wc;

          setBusy("Open your wallet to continue...");
          const accounts = await Promise.race([
            wc.enable(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("WalletConnect timed out. Select a wallet and approve the connection, then try again.")), 60_000)),
          ]);
          await ensureChain(wc);
          await setActiveWalletAccount(wc, accounts?.[0]);
          bindWalletEvents(wc);
          allowWalletReconnect();
          setUsingWC(true);
          return;
        }

        // 3) No WC Project ID → open MetaMask deep link
        if (isMobileDevice()) {
          openMetaMaskDeepLink();
          return;
        }
      }

      // 4) Fallback: tell user to install a wallet
      throw new Error("No browser wallet detected. Install MetaMask or choose WalletConnect (QR).");
    } catch (e) {
      setErr(walletErrorMessage(e, "Wallet connection could not be completed."));
    } finally {
      setBusy("");
    }
  }, [allowWalletReconnect, bindWalletEvents, setActiveWalletAccount]);

  // MetaMask Connect keeps the dapp open in the phone's browser while the
  // user approves the request in MetaMask. It is separate from WalletConnect,
  // which remains available for Trust Wallet and other wallet apps.
  const connectMetaMaskMobile = useCallback(async () => {
    setErr("");
    setBusy("Open MetaMask and approve the connection...");
    let sdk;
    try {
      sdk = metaMaskConnectRef.current;
      if (!sdk) {
        const { createMetamaskConnectEVM } = await import("@metamask/connect/evm");
        sdk = await createMetamaskConnectEVM({
          dapp: {
            name: "Engineering Drawing — EDG Presale",
            url: window.location.origin,
          },
          api: { supportedNetworks: { "eip155:56": READ_RPC } },
        });
        metaMaskConnectRef.current = sdk;
      }

      // MetaMask Connect opens the mobile wallet from a normal phone browser
      // and returns an EIP-1193 provider to this page after approval.
      const connection = await Promise.race([
        sdk.connect({ chainId: CHAIN_ID_DEC, forceRequest: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("MetaMask did not respond. Close the wallet prompt and try again.")), 60_000)),
      ]);
      // Awaiting keeps this compatible with both installed and newer
      // MetaMask Connect releases, including releases that return a Promise.
      const provider = await sdk.getProvider();
      await ensureChain(provider);

      await setActiveWalletAccount(provider, connection?.accounts?.[0]);
      bindWalletEvents(provider);
      allowWalletReconnect();
      setUsingWC(false);
    } catch (e) {
      if (metaMaskConnectRef.current === sdk) {
        try { await sdk?.disconnect?.(); } catch {}
        metaMaskConnectRef.current = null;
      }
      // The direct MetaMask browser link remains a reliable fallback when the
      // mobile bridge cannot be opened from a particular Android/iOS browser.
      if (
        isMobileDevice() &&
        !getInjectedProvider() &&
        /not respond|timed out|not installed|unavailable|not supported/i.test(String(e?.message || e))
      ) {
        setBusy("");
        openMetaMaskDeepLink();
        return;
      }
      setErr(walletErrorMessage(e, "MetaMask connection was cancelled or could not be completed."));
    } finally {
      setBusy("");
    }
  }, [allowWalletReconnect, bindWalletEvents, setActiveWalletAccount]);

  const disconnect = useCallback(async () => {
    try {
      if (wcRef.current?.disconnect) {
        await wcRef.current.disconnect();
      }
      if (metaMaskConnectRef.current?.disconnect) {
        await metaMaskConnectRef.current.disconnect();
      }
    } catch {}
    setSigner(null);
    setAccount(null);
    setUsingWC(false);
    setNativeBalance(0n);
    wcRef.current = null;
    metaMaskConnectRef.current = null;
    walletProviderRef.current = null;
    clearWalletListeners();
    blockWalletReconnect();
  }, [blockWalletReconnect, clearWalletListeners]);

  // A refresh must not make an already-approved browser wallet look
  // disconnected. eth_accounts is read-only: it restores only an account the
  // user previously approved and never opens a wallet permission prompt.
  useEffect(() => {
    let active = true;
    const restoreApprovedWallet = async () => {
      if (wasManuallyDisconnected()) return;
      const provider = getInjectedProvider();
      if (!provider?.request) return;
      try {
        const [accounts, chainId] = await Promise.all([
          provider.request({ method: "eth_accounts" }),
          provider.request({ method: "eth_chainId" }),
        ]);
        if (!active || !accounts?.[0] || String(chainId).toLowerCase() !== CHAIN_ID_HEX) return;
        await setActiveWalletAccount(provider, accounts[0]);
        if (!active) return;
        bindWalletEvents(provider);
        setUsingWC(false);
      } catch {
        // A wallet may be locked or unavailable during startup. The user can
        // still connect normally from the button when it becomes available.
      }
    };
    restoreApprovedWallet();
    return () => { active = false; };
  }, [bindWalletEvents, setActiveWalletAccount]);

  const switchAccount = useCallback(async () => {
    // WalletConnect account selection happens in the wallet app/QR flow.
    if (usingWC) {
      await disconnect();
      await connect(true);
      return;
    }

    const provider = walletProviderRef.current || getInjectedProvider();
    if (!provider?.request) {
      setErr("Open your wallet and reconnect to choose the account you want to use.");
      return;
    }

    setErr("");
    setBusy("Choose the account you want to use in your wallet...");
    try {
      const metaMaskSdk = metaMaskConnectRef.current;
      let accounts;
      if (metaMaskSdk && provider === walletProviderRef.current) {
        // MetaMask Connect has its own account picker on mobile.
        const connection = await metaMaskSdk.connect({ chainId: CHAIN_ID_DEC, forceRequest: true });
        accounts = connection?.accounts;
      } else {
        // MetaMask browser extension and compatible wallets show their account
        // selector through this standard permissions request.
        try {
          await provider.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }],
          });
        } catch (permissionError) {
          if (!/unsupported|not supported|does not exist|-32601/i.test(String(permissionError?.message || permissionError))) {
            throw permissionError;
          }
        }
        accounts = await provider.request({ method: "eth_requestAccounts" });
      }
      if (!accounts?.[0]) throw new Error("No wallet account was selected.");
      await ensureChain(provider);
      await setActiveWalletAccount(provider, accounts[0]);
      bindWalletEvents(provider);
      setPurchaseComplete(null);
      setTxHash("");
    } catch (error) {
      setErr(walletErrorMessage(error, "Account switching could not be completed."));
    } finally {
      setBusy("");
    }
  }, [bindWalletEvents, connect, disconnect, setActiveWalletAccount, usingWC]);

  /* ========= LOAD (public RPC) ========= */
  const loadData = useCallback(async () => {
    try {
      setErr("");
      setDataReady(false);
      const code = await readProv.getCode(PRESALE_ADDRESS);
      const ok = code && code !== "0x";
      setCodeOk(ok);
      if (!ok) {
        setLastUpdated(new Date().toLocaleTimeString());
        setRefreshIn(60);
        setDataReady(true);
        return;
      }

      const [dec, own, p, s, S, bPrice, minW, maxW, tSold, pmode] = await Promise.all([
        tokenRead.decimals(),
        presaleRead.owner(),
        presaleRead.paused(),
        presaleRead.currentStage(),
        presaleRead.STAGES(),
        presaleRead.bnbUsd1e18(),
        presaleRead.minPerWallet(),
        presaleRead.maxPerWallet(),
        presaleRead.tokensSold(),
        presaleRead.priceMode(),
      ]);

      setDecimals(Number(dec));
      setOwner(String(own).toLowerCase());
      setPaused(Boolean(p));
      setStage(Number(s));
      setStagesTotal(Number(S));
      setBnbUsd1e18(bPrice);
      setMinPerWallet(minW);
      setMaxPerWallet(maxW);
      setTokensSold(tSold);
      setPriceMode(Number(pmode));

      const caps = [], sold = [], remain = [], prices = [];
      for (let i = 0; i < Number(S); i++) {
        const [cap, sd, rem, pr] = await Promise.all([
          presaleRead.stageCaps(i),
          presaleRead.stageSold(i),
          presaleRead.stageRemaining(i),
          presaleRead.stagePricesUsd(i),
        ]);
        caps.push(cap); sold.push(sd); remain.push(rem); prices.push(pr);
      }
      setStageCaps(caps); setStageSold(sold); setStageRemain(remain); setStagePricesUsd(prices);

      if (account) {
        const [purchased, balance] = await Promise.all([
          presaleRead.purchased(account),
          readProv.getBalance(account),
        ]);
        setYourPurchased(purchased);
        setNativeBalance(balance);
      } else {
        setYourPurchased(0n);
        setNativeBalance(0n);
      }

      // expose to Tokenomics page
      const toInt = (x) => Math.round(Number(formatUnits(x || 0n, Number(dec))));
      const data = {
        stage1: { sold: toInt(sold[0]), total: toInt(caps[0]) },
        stage2: { sold: toInt(sold[1]), total: toInt(caps[1]) },
        stage3: { sold: toInt(sold[2]), total: toInt(caps[2]) },
        current: Number(s),
      };
      window.__EDG_PRESALE__ = data;
      Object.entries(data).forEach(([k, v]) => {
        if (typeof v === "object") {
          localStorage.setItem(`${k}Sold`,  String(v.sold));
          localStorage.setItem(`${k}Total`, String(v.total));
        } else {
          localStorage.setItem("currentStage", String(v));
        }
      });

      setLastUpdated(new Date().toLocaleTimeString());
      setRefreshIn(60);
      setDataReady(true);
    } catch (e) {
      setDataReady(false);
      const message = e?.shortMessage || e?.message || String(e);
      setErr(/quorum not met|failed to fetch|network error/i.test(message)
        ? "Live BNB Smart Chain data is temporarily unavailable. Please try again in a moment."
        : message);
    }
  }, [readProv, presaleRead, tokenRead, account]);

  /* ========= ESTIMATION ========= */
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        if (!presaleRead || !bnbIn || Number(bnbIn) <= 0) { setEstTokens(0n); setEstStage(null); return; }
        const wei = parseEther(bnbIn);

        try {
          const out = await presaleRead.estimateTokensOut?.(wei);
          if (out) {
            if (Array.isArray(out) && out.length >= 2) { if (stop) return; setEstStage(Number(out[0])); setEstTokens(out[1]); return; }
            if (stop) return; setEstStage(null); setEstTokens(out); return;
          }
        } catch {}

        const bnbUsd  = bnbUsd1e18 || 0n;
        const price18 = stagePricesUsd[stage] || 0n;
        if (!bnbUsd || !price18) { setEstTokens(0n); setEstStage(null); return; }
        const tokens = (wei * bnbUsd) / price18; // 18-dec tokens
        if (stop) return;
        setEstStage(stage);
        setEstTokens(tokens);
      } catch {
        if (stop) return;
        setEstStage(null);
        setEstTokens(0n);
      }
    })();
    return () => { stop = true; };
  }, [presaleRead, bnbIn, stage, bnbUsd1e18, stagePricesUsd]);

  /* ========= BOOTSTRAP + REFRESH ========= */
  useEffect(() => {
    loadData();
    const tick = setInterval(() => setRefreshIn((x) => (x > 0 ? x - 1 : 0)), 1000);
    const ref  = setInterval(loadData, 60_000);
    return () => { clearInterval(tick); clearInterval(ref); };
  }, [loadData]);

  useEffect(() => { loadData(); }, [account, loadData]);

  // Mobile wallets can successfully broadcast a transaction but fail to return
  // the transaction response to the browser tab. Poll the contract's public
  // per-wallet purchase total so buyers still see their confirmation after
  // returning from the wallet app.
  const completeRecoveredPurchase = useCallback(async (pending, currentPurchased) => {
    let receivedTokens = pending.tokensExpected;
    try {
      const boughtBefore = parseUnits(pending.purchasedBefore, 0);
      const received = currentPurchased - boughtBefore;
      if (received > 0n) receivedTokens = formatUnits(received, decimals);
    } catch {}

    purchaseRecoveredRef.current = true;
    setBusy("");
    setErr("");
    setTxHash(pending.hash || "");
    setPurchaseComplete({
      hash: pending.hash || "",
      bnb: pending.amount,
      tokens: receivedTokens,
      stage: Number(pending.stage),
    });
    setBnbIn("0.01");
    clearPendingPurchase();
    await loadData();
  }, [clearPendingPurchase, decimals, loadData]);

  useEffect(() => {
    if (!pendingPurchase || !account || purchaseComplete) return undefined;
    if (pendingPurchase.account !== account.toLowerCase()) return undefined;

    let stopped = false;
    let checking = false;
    const checkOnChainPurchase = async () => {
      if (checking || stopped) return;
      checking = true;
      try {
        const purchasedNow = await presaleRead.purchased(account);
        const purchasedBefore = parseUnits(pendingPurchase.purchasedBefore, 0);
        if (!stopped && purchasedNow > purchasedBefore) {
          await completeRecoveredPurchase(pendingPurchase, purchasedNow);
        }
      } catch {
        // The normal refresh cycle will retry when a public BSC RPC is busy.
      } finally {
        checking = false;
      }
    };
    const checkWhenBackInBrowser = () => {
      if (!document.hidden) {
        setBusy("Checking BNB Smart Chain for your completed purchase...");
        checkOnChainPurchase();
      }
    };

    checkOnChainPurchase();
    const interval = setInterval(checkOnChainPurchase, 5_000);
    window.addEventListener("focus", checkWhenBackInBrowser);
    document.addEventListener("visibilitychange", checkWhenBackInBrowser);
    return () => {
      stopped = true;
      clearInterval(interval);
      window.removeEventListener("focus", checkWhenBackInBrowser);
      document.removeEventListener("visibilitychange", checkWhenBackInBrowser);
    };
  }, [account, completeRecoveredPurchase, pendingPurchase, presaleRead, purchaseComplete]);

  const enteredBnbWei = (() => {
    try { return parseEther(String(bnbIn || "").trim()); }
    catch { return 0n; }
  })();
  const requiredBnbWei = enteredBnbWei > 0n ? enteredBnbWei + BSC_GAS_RESERVE_WEI : 0n;
  const bnbShortfallWei = requiredBnbWei > nativeBalance ? requiredBnbWei - nativeBalance : 0n;
  const hasEnoughBnb = !account || requiredBnbWei === 0n || nativeBalance >= requiredBnbWei;

  /* ========= ACTIONS ========= */
  const doBuy = async () => {
    let pending = null;
    try {
      if (!presaleWrite) throw new Error("Connect wallet first.");
      if (!dataReady) throw new Error("Live presale data is still loading. Please wait and try again.");
      if (!codeOk) throw new Error("The presale contract could not be verified on BNB Smart Chain.");
      if (paused) throw new Error("The presale is currently paused.");
      const amount = parseEther(String(bnbIn || "").trim());
      if (amount <= 0n) throw new Error("Enter a valid BNB amount greater than zero.");
      if (nativeBalance < amount + BSC_GAS_RESERVE_WEI) {
        throw new Error(`Insufficient BNB. You have ${fmt(Number(formatUnits(nativeBalance, 18)), 6)} BNB. Add at least ${fmt(Number(formatUnits((amount + BSC_GAS_RESERVE_WEI) - nativeBalance, 18)), 6)} BNB to cover this purchase and its network fee.`);
      }
      if (estTokens <= 0n) throw new Error("A token estimate is unavailable. Refresh the page and try again.");
      if (estTokens > youCanBuyUpTo) throw new Error("This amount exceeds the current stage or wallet purchase limit.");

      setBusy("Checking purchase details...");
      setErr("");
      setTxHash("");
      setPurchaseComplete(null);
      purchaseRecoveredRef.current = false;
      pending = {
        account: account.toLowerCase(),
        amount: formatUnits(amount, 18),
        purchasedBefore: yourPurchased.toString(),
        tokensExpected: formatUnits(estTokens, decimals),
        stage: Number(estStage ?? stage),
        startedAt: Date.now(),
        hash: "",
      };
      savePendingPurchase(pending);
      setBusy("Confirm the transaction in your wallet...");
      const tx = await presaleWrite.buy({ value: amount });
      pending = { ...pending, hash: tx.hash };
      savePendingPurchase(pending);
      setTxHash(tx.hash);
      setBusy("Transaction submitted. Waiting for 2 BNB Smart Chain confirmations...");
      await tx.wait(2);

      // A mobile return may already have been confirmed through the public
      // contract check. Keep its data, but add the receipt link if available.
      if (purchaseRecoveredRef.current) {
        setTxHash(tx.hash);
        setPurchaseComplete((previous) => previous ? { ...previous, hash: tx.hash } : previous);
        clearPendingPurchase();
        return;
      }

      setBusy("");
      setPurchaseComplete({
        hash: tx.hash,
        bnb: formatUnits(amount, 18),
        tokens: formatUnits(estTokens, decimals),
        stage: estStage ?? stage,
      });
      setBnbIn("0.01");
      clearPendingPurchase();
      await loadData();
    } catch (e) {
      if (purchaseRecoveredRef.current) return;
      const rawMessage = String(e?.shortMessage || e?.message || e);
      if (pending && !/user rejected|user denied|rejected the request|\b4001\b/i.test(rawMessage)) {
        // Do not show a failed purchase when a mobile wallet has already sent
        // it but did not return its response to this browser tab.
        setBusy("Checking BNB Smart Chain for your completed purchase...");
        return;
      }
      if (pending) clearPendingPurchase();
      setBusy("");
      setErr(walletErrorMessage(e, "The purchase could not be completed."));
    }
  };

  /* Admin */
  const isAdmin = account && owner && account === owner;

  const adminPause = async (p) => {
    try { setBusy("Pause/Start..."); const tx = await presaleWrite.pause(p); await tx.wait(); setBusy(""); loadData(); }
    catch (e) { setBusy(""); setErr(e?.shortMessage || e?.message || String(e)); }
  };
  const adminNext = async () => {
    try { setBusy("Next stage..."); const tx = await presaleWrite.nextStage(); await tx.wait(); setBusy(""); loadData(); }
    catch (e) { setBusy(""); setErr(e?.shortMessage || e?.message || String(e)); }
  };
  const adminPrev = async () => {
    try { setBusy("Prev stage..."); const tx = await presaleWrite.prevStage(); await tx.wait(); setBusy(""); loadData(); }
    catch (e) { setBusy(""); setErr(e?.shortMessage || e?.message || String(e)); }
  };

  const [depositAmount, setDepositAmount] = useState("");
  const adminDeposit = async () => {
    try {
      setBusy("Deposit EDG...");
      const tx = await presaleWrite.depositEDG(parseUnits(depositAmount || "0", decimals));
      await tx.wait(); setBusy(""); loadData();
    } catch (e) { setBusy(""); setErr(e?.shortMessage || e?.message || String(e)); }
  };

  const [minEDG, setMinEDG] = useState(""), [maxEDG, setMaxEDG] = useState("");
  const adminSetLimits = async () => {
    try {
      setBusy("Update limits...");
      const tx = await presaleWrite.setWalletLimits(
        parseUnits(minEDG || "0", decimals),
        parseUnits(maxEDG || "0", decimals)
      );
      await tx.wait(); setBusy(""); loadData();
    } catch (e) { setBusy(""); setErr(e?.shortMessage || e?.message || String(e)); }
  };

  const [fundsWallet, setFundsWallet] = useState("");
  const adminSetFundsWallet = async () => {
    try { setBusy("Update funds wallet..."); const tx = await presaleWrite.setFundsWallet(fundsWallet); await tx.wait(); setBusy(""); loadData(); }
    catch (e) { setBusy(""); setErr(e?.shortMessage || e?.message || String(e)); }
  };

  const [withdrawAmt, setWithdrawAmt] = useState("");
  const adminWithdrawUnsold = async () => {
    try { setBusy("Withdraw unsold..."); const tx = await presaleWrite.withdrawUnsoldEDG(parseUnits(withdrawAmt || "0", decimals)); await tx.wait(); setBusy(""); loadData(); }
    catch (e) { setBusy(""); setErr(e?.shortMessage || e?.message || String(e)); }
  };
  const adminWithdrawRaised = async () => {
    try { setBusy("Withdraw raised..."); const tx = await presaleWrite.withdrawRaised(); await tx.wait(); setBusy(""); loadData(); }
    catch (e) { setBusy(""); setErr(e?.shortMessage || e?.message || String(e)); }
  };

  /* derived prices */
  const bnbUsd        = Number(formatUnits(bnbUsd1e18 || 0n, 18));
  const tokenPriceUsd = Number(stagePricesUsd[stage] ? formatUnits(stagePricesUsd[stage], 18) : "0");
  const tokenPriceBnb = bnbUsd > 0 && tokenPriceUsd > 0 ? tokenPriceUsd / bnbUsd : 0;

  const youCanBuyUpTo = (() => {
    try {
      const leftStage   = stageRemain[stage] ?? 0n;
      const leftWallet  = maxPerWallet > yourPurchased ? (maxPerWallet - yourPurchased) : 0n;
      return leftStage < leftWallet ? leftStage : leftWallet;
    } catch { return 0n; }
  })();

  const mobile = isMobileUA || isMobileDevice();
  const injectedWallet = hasInjectedWallet || Boolean(getInjectedProvider());

  if (!PRESALE_ADDRESS || !PRESALE_ABI || !TOKEN_ADDRESS || !TOKEN_ABI) {
    return (
      <div className="presale-wrap">
        <div className="error">ABI/Address missing in your JSON files.</div>
      </div>
    );
  }

  return (
    <div className="presale-wrap">
      {/* Top bar */}
      <div className="presale-top">
        <div className="left-links">
          <a href={`${EXPLORER}${PRESALE_ADDRESS}`} target="_blank" rel="noreferrer">Presale Contract</a>
          <span> · </span>
          <a href={`${EXPLORER}${TOKEN_ADDRESS}`} target="_blank" rel="noreferrer">Token</a>
          <span className="muted"> &nbsp;&nbsp;Last update: {lastUpdated || "—"} — Auto refresh in: {refreshIn}s</span>
        </div>

        <div className="right" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {account ? (
            <>
              <div className={`connected-account ${isAdmin ? "owner" : "buyer"}`} title={account}>
                <span>{isAdmin ? "Owner account" : "Public buyer"}</span>
                <strong>{short(account)}</strong>
              </div>
              <button className={busy ? "btn disabled" : "btn secondary"} onClick={switchAccount} disabled={Boolean(busy)}>
                Switch account
              </button>
              <button className={busy ? "btn disabled" : "btn secondary"} onClick={disconnect} disabled={Boolean(busy)}>
                Disconnect{usingWC ? " (WC)" : ""}
              </button>
            </>
          ) : (
            <>
              <button className="btn primary" onClick={mobile && !injectedWallet ? connectMetaMaskMobile : () => connect()} disabled={Boolean(busy)}>
                {busy ? "Connecting…" : mobile && !injectedWallet ? "Connect MetaMask" : "Connect Wallet"}
              </button>
              {mobile && !injectedWallet && (
                <button className="btn secondary" onClick={openMetaMaskDeepLink} disabled={Boolean(busy)}>
                  Open MetaMask browser
                </button>
              )}
              {WC_PROJECT_ID && (
                <button className="btn secondary" onClick={() => connect(true)} disabled={Boolean(busy)}>
                  {mobile ? "Use WalletConnect" : "WalletConnect (QR)"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {mobile && !account && (
        <div className="mobile-wallet-guide">
          <strong>Buying from your phone</strong>
          <span>Tap Connect MetaMask and approve in the wallet app. If it does not open, use Open MetaMask browser. Trust Wallet and other supported apps can use WalletConnect.</span>
        </div>
      )}

      <h2 className="title">Engineering Drawing — EDG Presale (Mainnet)</h2>

      <div className={`sale-status ${!dataReady ? "checking" : paused || !codeOk ? "closed" : "open"}`} role="status">
        {!dataReady ? "Checking live BNB Smart Chain presale data…" : !codeOk ? "Presale contract unavailable — purchases are disabled." : paused ? "Presale is currently paused — purchases are disabled." : "Public presale is open on BNB Smart Chain."}
      </div>

      {!codeOk && (
        <div className="error" style={{marginTop:8}}>
          Contract not found at <strong>{PRESALE_ADDRESS}</strong> on BSC Mainnet.
          Check the address in <code>EDGPresaleABI.json</code>.
        </div>
      )}

      {/* KPIs */}
      <div className="cards">
        <div className="card"><div className="label">Presale Status</div><div className={paused ? "value red":"value green"}>{paused?"Closed":"Open"}</div></div>
        <div className="card"><div className="label">Current Stage</div><div className="value">Stage {stage+1}</div><div className="sub">Detected base: 0-based</div></div>
        <div className="card"><div className="label">Token Price</div><div className="value">{fmt(tokenPriceBnb,10)} BNB <span className="sub">(≈ ${fmt(tokenPriceUsd)} USDT)</span></div></div>
        <div className="card"><div className="label">BNB Price</div><div className="value">1 BNB = ${fmt(bnbUsd)} USDT</div><div className="sub">Mode: {priceMode===0?"ORACLE":"MANUAL"}</div></div>
        <div className="card">
          <div className="label">Total Sold</div>
          <div className="value">
            {fmtInt(Number(formatUnits(tokensSold, decimals)))} / {fmtInt(Number(formatUnits(stageCaps.reduce((a,b)=>a+b,0n), decimals)))} EDG
          </div>
          <div className="sub">Stage {stage+1} cap: {fmtInt(Number(formatUnits(stageCaps[stage]||0n, decimals)))} EDG</div>
        </div>
      </div>

      {/* Stages (bars) */}
      <div className="stages">
        {Array.from({ length: stagesTotal }).map((_, i) => {
          const sold = Number(formatUnits(stageSold[i] || 0n, decimals));
          const cap  = Number(formatUnits(stageCaps[i]  || 0n, decimals));
          const pct  = cap>0 ? Math.min(100, (sold/cap)*100) : 0;
          return (
            <div key={i} className={`stage ${i===stage?"live":""}`}>
              <div className="stage-head">
                <span>Stage {i+1}</span>
                {i===stage && <span className="pill">LIVE</span>}
                <span className="muted">— {fmtInt(sold)} / {fmtInt(cap)} EDG</span>
              </div>
              <div className="bar"><div className="fill" style={{width:`${pct}%`}}/></div>
            </div>
          );
        })}
      </div>

      {/* Buy */}
      <div className="buy card">
        {err &&  <div className="error">⚠ {err}</div>}
        {busy && <div className="busy">{busy}</div>}

        {purchaseComplete && (
          <div className="purchase-success" role="status" aria-live="polite">
            <div className="purchase-success-header">
              <div className="purchase-success-icon" aria-hidden="true">✓</div>
              <div className="purchase-success-copy">
                <p className="purchase-success-kicker">Purchase confirmed</p>
                <h3>Thank you for supporting EDG!</h3>
                <p>Your transaction has been confirmed on BNB Smart Chain.</p>
              </div>
            </div>

            <div className="purchase-success-summary">
              <div>
                <span>EDG purchased</span>
                <strong>{fmtInt(Number(purchaseComplete.tokens))} EDG</strong>
              </div>
              <div>
                <span>BNB spent</span>
                <strong>{fmt(Number(purchaseComplete.bnb), 6)} BNB</strong>
              </div>
              <div>
                <span>Presale stage</span>
                <strong>Stage {Number(purchaseComplete.stage) + 1}</strong>
              </div>
            </div>

            <p className="purchase-success-note">Your EDG purchase is recorded on-chain. Keep your transaction link for your records.</p>
            <div className="purchase-success-actions">
              {purchaseComplete.hash ? (
                <a className="btn success-receipt" href={`https://bscscan.com/tx/${purchaseComplete.hash}`} target="_blank" rel="noreferrer">
                  View transaction
                </a>
              ) : (
                <a className="btn success-receipt" href={`${EXPLORER}${PRESALE_ADDRESS}`} target="_blank" rel="noreferrer">
                  View presale contract
                </a>
              )}
              <button className="btn success-more" onClick={() => setPurchaseComplete(null)}>
                Buy more EDG
              </button>
            </div>
          </div>
        )}

        <div className={`purchase-form ${purchaseComplete ? "hidden" : ""}`}>
        <div className="title2">Purchase Tokens</div>
        <div className="sub">
          You can buy up to {fmtInt(Number(formatUnits(youCanBuyUpTo, decimals)))} EDG
        </div>

        <div className="row">
          <input type="number" inputMode="decimal" min="0" step="0.001" value={bnbIn} onChange={(e)=>setBnbIn(e.target.value)} placeholder="BNB amount" aria-label="BNB amount to spend" />
        </div>
        <div className="quick-amounts" role="group" aria-label="Quick BNB amounts">
          <span>Quick amount</span>
          {["0.002", "0.005", "0.01", "0.05"].map((amount) => (
            <button key={amount} className={`btn bnb ${bnbIn === amount ? "selected" : ""}`} onClick={() => setBnbIn(amount)}>
              {amount} BNB
            </button>
          ))}
        </div>

        {account && (
          <div className={`wallet-balance ${hasEnoughBnb ? "ready" : "low"}`}>
            <span>Your BSC BNB balance</span>
            <strong>{fmt(Number(formatUnits(nativeBalance, 18)), 6)} BNB</strong>
            {hasEnoughBnb ? (
              <small>Enough for this purchase and an estimated network fee.</small>
            ) : (
              <small>Add at least {fmt(Number(formatUnits(bnbShortfallWei, 18)), 6)} BNB to cover this purchase and its network fee.</small>
            )}
          </div>
        )}

        <div className="sub">
          Estimated Tokens: {fmtInt(Number(formatUnits(estTokens || 0n, decimals)))} EDG {estStage!==null ? `(est. stage ${Number(estStage)+1})` : ""}
        </div>

        <div className="sub">
          Min: {fmtInt(Number(formatUnits(minPerWallet, decimals)))} | Max per wallet: {fmtInt(Number(formatUnits(maxPerWallet, decimals)))} | Your EDG: {fmtInt(Number(formatUnits(yourPurchased, decimals)))} · Contract EDG (stage remaining): {fmtInt(Number(formatUnits(stageRemain[stage] || 0n, decimals)))}
        </div>

        {txHash && (
          <div className="tx-status">
            Transaction submitted: <a href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer">View on BscScan</a>
          </div>
        )}

        <button className="btn buy" onClick={doBuy} disabled={!account || Boolean(busy) || !dataReady || !codeOk || paused || !hasEnoughBnb || estTokens <= 0n || estTokens > youCanBuyUpTo}>
          {!account ? "Connect wallet to buy" : busy ? busy : !hasEnoughBnb ? "Insufficient BNB" : paused ? "Presale paused" : "Buy Tokens"}
        </button>
        </div>
      </div>

      {/* Admin (unchanged) */}
      {isAdmin && (
        <div className="admin card">
          <div className="title2">Admin</div>

          <div className="row gap">
            <button className="btn" onClick={()=>adminPause(!paused)}>{paused?"Start Presale":"Pause Presale"}</button>
            <button className="btn" onClick={adminPrev}>Prev Stage</button>
            <button className="btn" onClick={adminNext}>Next Stage</button>
          </div>

          <div className="row gap">
            <input value={depositAmount} onChange={(e)=>setDepositAmount(e.target.value)} placeholder={`Deposit EDG (${decimals}-dec)`}/>
            <button className="btn" onClick={adminDeposit}>Deposit EDG</button>
          </div>

          <div className="row gap">
            <input value={minEDG} onChange={(e)=>setMinEDG(e.target.value)} placeholder="Min EDG"/>
            <input value={maxEDG} onChange={(e)=>setMaxEDG(e.target.value)} placeholder="Max EDG"/>
            <button className="btn" onClick={adminSetLimits}>Update Limits</button>
          </div>

          <div className="row gap">
            <input value={fundsWallet} onChange={(e)=>setFundsWallet(e.target.value)} placeholder="Funds wallet"/>
            <button className="btn" onClick={adminSetFundsWallet}>Update Funds Wallet</button>
          </div>

          <div className="row gap">
            <input value={withdrawAmt} onChange={(e)=>setWithdrawAmt(e.target.value)} placeholder="Withdraw unsold EDG amount"/>
            <button className="btn" onClick={adminWithdrawUnsold}>Withdraw Unsold EDG</button>
            <button className="btn" onClick={adminWithdrawRaised}>Withdraw Raised BNB</button>
          </div>
        </div>
      )}

      <div className="footnote">
        Engineering Drawing Presale on BSC Mainnet ·
        &nbsp;<a href={`${EXPLORER}${PRESALE_ADDRESS}`} target="_blank" rel="noreferrer">Presale Contract</a> ·
        &nbsp;<a href={`${EXPLORER}${TOKEN_ADDRESS}`} target="_blank" rel="noreferrer">Token</a>.
        Data auto-refreshes every minute for transparency.
      </div>
    </div>
  );
}
