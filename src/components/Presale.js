import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  BrowserProvider,
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
const READ_RPC     = "https://bsc-dataseed.binance.org";
const EXPLORER     = "https://bscscan.com/address/";

/* ========= ADDRS/ABIs (robust keys) =========
   Your mainnet addresses are included here as fallbacks so links always render. */
const FALLBACK_PRESALE = "0x944483c8083827A8BF09c12cFC57DB6a5b22697A";
const FALLBACK_TOKEN   = "0xa90Cc0137FDA4285Eaa6da0f7a5118A1432b2a76";

const PRESALE_ADDRESS = presaleMeta.ADDRESS || presaleMeta.address || FALLBACK_PRESALE;
const PRESALE_ABI     = presaleMeta.ABI      || presaleMeta.abi;
const TOKEN_ADDRESS   = tokenMeta.ADDRESS    || tokenMeta.address || FALLBACK_TOKEN;
const TOKEN_ABI       = tokenMeta.ABI        || tokenMeta.abi;

/* ========= HELPERS ========= */
const fmtInt = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const fmt = (n, d = 2) =>
  Number(n ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: d,
  });

const short = (addr) => (addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "");

/* ========= COMPONENT ========= */
export default function Presale() {
  /* wallet / provider */
  const [signer, setSigner]     = useState(null);
  const [account, setAccount]   = useState(null);
  const readProv = useMemo(() => new JsonRpcProvider(READ_RPC, CHAIN_ID_DEC), []);

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

  /* contracts (read+write) */
  const presaleRead = useMemo(
    () => new Contract(PRESALE_ADDRESS, PRESALE_ABI, readProv),
    [readProv]
  );
  const tokenRead = useMemo(
    () => new Contract(TOKEN_ADDRESS, TOKEN_ABI, readProv),
    [readProv]
  );
  const presaleWrite = useMemo(
    () => (signer ? new Contract(PRESALE_ADDRESS, PRESALE_ABI, signer) : null),
    [signer]
  );

  /* ========= CONNECT ========= */
  const connect = useCallback(async () => {
    try {
      if (!window.ethereum) throw new Error("No wallet detected. Install MetaMask.");

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: CHAIN_ID_HEX }],
        });
      } catch (e) {
        if (e?.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: CHAIN_ID_HEX,
              chainName: "BNB Smart Chain",
              nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
              rpcUrls: [READ_RPC],
              blockExplorerUrls: ["https://bscscan.com/"],
            }],
          });
        } else {
          throw e;
        }
      }

      const prov    = new BrowserProvider(window.ethereum, "any");
      const signer_ = await prov.getSigner();
      const addr    = (await signer_.getAddress()).toLowerCase();

      setSigner(signer_);
      setAccount(addr);
      setErr("");
    } catch (e) {
      setErr(e?.shortMessage || e?.message || String(e));
    }
  }, []);

  const disconnect = useCallback(() => {
    setSigner(null);
    setAccount(null);
  }, []);

  /* ========= LOAD (public RPC) ========= */
  const loadData = useCallback(async () => {
    try {
      setErr("");
      const code = await readProv.getCode(PRESALE_ADDRESS);
      const ok = code && code !== "0x";
      setCodeOk(ok);
      if (!ok) {
        setLastUpdated(new Date().toLocaleTimeString());
        setRefreshIn(60);
        return;
      }

      const [
        dec, own, p, s, S, bPrice, minW, maxW, tSold, pmode,
      ] = await Promise.all([
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

      if (account) setYourPurchased(await presaleRead.purchased(account));
      else setYourPurchased(0n);

      /* Expose exact integers for other pages */
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
    } catch (e) {
      setErr(e?.shortMessage || e?.message || String(e));
    }
  }, [readProv, presaleRead, tokenRead, account]);

  /* ========= ESTIMATION ========= */
  useEffect(() => {
    let stop = false;
    (async () => {
      try {
        if (!presaleRead || !bnbIn || Number(bnbIn) <= 0) { setEstTokens(0n); setEstStage(null); return; }
        const wei = parseEther(bnbIn);

        // try on-chain helper if exists
        try {
          const out = await presaleRead.estimateTokensOut?.(wei);
          if (out) {
            if (Array.isArray(out) && out.length >= 2) { if (stop) return; setEstStage(Number(out[0])); setEstTokens(out[1]); return; }
            if (stop) return; setEstStage(null); setEstTokens(out); return;
          }
        } catch {}

        // fallback math
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

  /* ========= ACTIONS ========= */
  const doBuy = async () => {
    try {
      if (!presaleWrite) throw new Error("Connect wallet first.");
      setBusy("Buying...");
      setErr("");
      const tx = await presaleWrite.buy({ value: parseEther(bnbIn || "0") });
      await tx.wait();
      setBusy("");
      setBnbIn("0.01");
      await loadData();
      alert("Success!");
    } catch (e) {
      setBusy("");
      setErr(e?.shortMessage || e?.message || String(e));
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

  if (!PRESALE_ADDRESS || !PRESALE_ABI || !TOKEN_ADDRESS || !TOKEN_ABI) {
    return (
      <div className="presale-wrap">
        <div className="error">ABI/Address missing in your JSON files.</div>
      </div>
    );
  }

  return (
    <div className="presale-wrap">
      {/* Top bar with BscScan links */}
      <div className="presale-top">
        <div className="left-links">
          <a href={`${EXPLORER}${PRESALE_ADDRESS}`} target="_blank" rel="noreferrer">Presale Contract</a>
          <span> · </span>
          <a href={`${EXPLORER}${TOKEN_ADDRESS}`} target="_blank" rel="noreferrer">Token</a>
          <span className="muted"> &nbsp;&nbsp;Last update: {lastUpdated || "—"} — Auto refresh in: {refreshIn}s</span>
        </div>
        <div className="right">
          {account ? (
            <button className={busy ? "btn disabled" : "btn secondary"} onClick={disconnect}>
              {short(account)} · Disconnect
            </button>
          ) : (
            <button className="btn primary" onClick={connect}>Connect Wallet</button>
          )}
        </div>
      </div>

      <h2 className="title">Engineering Drawing — EDG Presale (Mainnet)</h2>

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

        <div className="title2">Purchase Tokens</div>
        <div className="sub">
          You can buy up to {fmtInt(Number(formatUnits(youCanBuyUpTo, decimals)))} EDG
        </div>

        <div className="row">
          <input type="number" min="0" step="0.001" value={bnbIn} onChange={(e)=>setBnbIn(e.target.value)} placeholder="BNB amount"/>
          <button className="btn bnb" onClick={() => setBnbIn("0.01")}>0.01 BNB</button>
        </div>

        <div className="sub">
          Estimated Tokens: {fmtInt(Number(formatUnits(estTokens || 0n, decimals)))} EDG {estStage!==null ? `(est. stage ${Number(estStage)+1})` : ""}
        </div>

        <div className="sub">
          Min: {fmtInt(Number(formatUnits(minPerWallet, decimals)))} | Max per wallet: {fmtInt(Number(formatUnits(maxPerWallet, decimals)))} | Your EDG: {fmtInt(Number(formatUnits(yourPurchased, decimals)))} · Contract EDG (stage remaining): {fmtInt(Number(formatUnits(stageRemain[stage] || 0n, decimals)))}
        </div>

        <button className="btn buy" onClick={doBuy} disabled={!account || busy}>Buy Tokens</button>
      </div>

      {/* Admin */}
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
