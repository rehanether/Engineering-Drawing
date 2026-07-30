import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, formatUnits, parseUnits } from "ethers";
import "./Evaporators.css";
import EvaporatorModel3D from "./evaporator/EvaporatorModel3D";
import { calculateEvaporatorDesign } from "./evaporator/designEngine";
import { createBepPackage } from "./evaporator/downloadPackage";
import presaleMeta from "../EDGPresaleABI.json";
import tokenMeta from "../EnggDrawTokenABI.json";

const configuredApiBase = process.env.REACT_APP_API_BASE_URL || "";
const API_BASE = /^https?:\/\//.test(configuredApiBase) && !configuredApiBase.includes("localhost")
  ? configuredApiBase.replace(/\/$/, "")
  : "";
const EVAPORATOR_PRICE_USD = "100";
const EDG_CHAIN_ID = "0x38";
const EDG_AMOUNT = "5000";
const EDG_ADMIN_WALLET = "0xD9738cc53E9746a01cAC8EF01aF17fF4e88DD25F";
const EDG_TOKEN_ADDRESS = tokenMeta.ADDRESS;
const EDG_PRESALE_ADDRESS = presaleMeta.ADDRESS;
const EDG_TRANSFER_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
];
const BSC_RPC = process.env.REACT_APP_BSC_RPC || "https://bsc-dataseed.bnbchain.org";

const DEFAULTS = {
  capacityTph: 1, feedConc: 2, finalConc: 15, feedTemp: 30, density: 1000,
  operatingHours: 24, boilingTemp: 60, heatLift: 8, uValue: 1500,
  compressorEfficiency: 75, heatRecovery: 90, industry: "General wastewater", product: "Concentrated process liquor",
  exchangeRateInrUsd: 84, clientName: "Client / End User", projectName: "Industrial Wastewater MVR Evaporator", projectLocation: "To be confirmed",
};

export default function Evaporators() {
  const [inputs, setInputs] = useState(DEFAULTS);
  const [generated, setGenerated] = useState(true);
  const [tab, setTab] = useState("pfd");
  const [payment, setPayment] = useState("BNB");
  const [paymentStatus, setPaymentStatus] = useState(
    localStorage.getItem("evaporatorPackagePaid") ? "paid" : "idle"
  );
  const [edgLive, setEdgLive] = useState({ loading: true, bnb: 0.18, stage: null });
  const [message, setMessage] = useState("");
  const pfdRef = useRef(null);
  const design = useMemo(() => calculateEvaporatorDesign(inputs), [inputs]);

  useEffect(() => {
    let active = true;
    const loadEdgPrice = async () => {
      try {
        const provider = new JsonRpcProvider(BSC_RPC, 56, { staticNetwork: true });
        const presale = new Contract(EDG_PRESALE_ADDRESS, presaleMeta.ABI, provider);
        const stage = await presale.currentStage();
        const [bnbUsdRaw, edgUsdRaw] = await Promise.all([
          presale.bnbUsd1e18(),
          presale.stagePricesUsd(stage),
        ]);
        const bnbUsd = Number(formatUnits(bnbUsdRaw, 18));
        const edgUsd = Number(formatUnits(edgUsdRaw, 18));
        const bnb = bnbUsd > 0 ? (Number(EDG_AMOUNT) * edgUsd) / bnbUsd : 0.18;
        if (active) setEdgLive({ loading: false, bnb, stage: Number(stage) + 1 });
      } catch {
        if (active) setEdgLive({ loading: false, bnb: 0.18, stage: null });
      }
    };
    loadEdgPrice();
    const timer = window.setInterval(loadEdgPrice, 60000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const paymentResult = query.get("payment");
    const orderId = query.get("order") || localStorage.getItem("evaporatorPaymentOrder");
    if (paymentResult === "cancelled") {
      setMessage("Payment was cancelled. Your simulated design remains available.");
      window.history.replaceState({}, "", window.location.pathname);
      return undefined;
    }
    if (paymentResult !== "return" || !orderId) return undefined;

    setPayment("BNB");
    setPaymentStatus("pending");
    setMessage("Checking the secure payment status...");
    let stopped = false;
    let attempts = 0;
    const checkStatus = async () => {
      attempts += 1;
      try {
        const response = await fetch(`${API_BASE}/api/payments/nowpayments/status/${encodeURIComponent(orderId)}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not verify payment.");
        if (result.status === "finished") {
          localStorage.setItem("evaporatorPackagePaid", `NOWPAYMENTS-${orderId}`);
          localStorage.removeItem("evaporatorPaymentOrder");
          setPaymentStatus("paid");
          setMessage("BNB payment confirmed. Your professional BEP is unlocked.");
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }
        if (["failed", "expired", "refunded"].includes(result.status)) {
          setPaymentStatus("idle");
          setMessage(`Payment ${result.status}. Please create a new checkout.`);
          return;
        }
        if (!stopped && attempts < 30) window.setTimeout(checkStatus, 4000);
        else if (!stopped) {
          setPaymentStatus("idle");
          setMessage("Payment is still processing. Return shortly with the same browser to check again.");
        }
      } catch (error) {
        setPaymentStatus("idle");
        setMessage(error.message || "Could not verify payment.");
      }
    };
    checkStatus();
    return () => { stopped = true; };
  }, []);
  const update = (key, value) => {
    setInputs((current) => {
      const next = { ...current, [key]: value };
      const numeric = Number(value);
      if (key === "feedConc" && numeric >= Number(current.finalConc)) next.finalConc = Math.min(60, numeric + .5);
      if (key === "feedTemp" && numeric + 5 > Number(current.boilingTemp)) next.boilingTemp = Math.min(90, numeric + 5);
      return next;
    });
    setGenerated(true);
    setTab("pfd");
    setMessage("");
  };
  const enforce = (key, min, max) => (event) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) update(key, Math.min(max, Math.max(min, value)));
  };

  async function downloadLocalPackage() {
    setMessage("Preparing professional BEP package…");
    try {
      const pfdSvg = pfdRef.current
        ? new XMLSerializer().serializeToString(pfdRef.current)
        : `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><text x="50" y="80">MVR Evaporator PFD</text></svg>`;
      const blob = await createBepPackage(design, pfdSvg);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `engineering-drawing-mvr-${design.inputs.capacityTph}tph-bep.zip`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage("Professional BEP downloaded successfully.");
    } catch (error) {
      setMessage(error.message || "Could not create the package.");
    }
  }

  async function startBnbGateway() {
    setMessage("");
    setPaymentStatus("pending");
    try {
      const response = await fetch(`${API_BASE}/api/payments/nowpayments/evaporator/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          design: {
            capacityTph: Number(design.inputs.capacityTph),
            feedConc: Number(design.inputs.feedConc),
            finalConc: Number(design.inputs.finalConc),
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.invoiceUrl) throw new Error(result.error || "Could not create checkout.");
      localStorage.setItem("evaporatorPaymentOrder", result.orderId);
      window.location.assign(result.invoiceUrl);
    } catch (error) {
      setPaymentStatus("idle");
      setMessage(error.message || "Could not open the secure BNB checkout.");
    }
  }

  async function payWithEdg() {
    setMessage("");
    if (!window.ethereum) {
      setMessage("Install MetaMask or open this page in your wallet browser to pay with EDG.");
      return;
    }
    setPaymentStatus("pending");
    try {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: EDG_CHAIN_ID }],
        });
      } catch (error) {
        if (error.code !== 4902) throw error;
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: EDG_CHAIN_ID,
            chainName: "BNB Smart Chain",
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            rpcUrls: [BSC_RPC],
            blockExplorerUrls: ["https://bscscan.com"],
          }],
        });
      }
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const buyer = await signer.getAddress();
      const token = new Contract(EDG_TOKEN_ADDRESS, EDG_TRANSFER_ABI, signer);
      const requiredEdg = parseUnits(EDG_AMOUNT, 18);
      const [edgBalance, bnbBalance] = await Promise.all([
        token.balanceOf(buyer),
        provider.getBalance(buyer),
      ]);
      if (edgBalance < requiredEdg) {
        const available = Number(formatUnits(edgBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 });
        const shortfall = Number(formatUnits(requiredEdg - edgBalance, 18)).toLocaleString(undefined, { maximumFractionDigits: 2 });
        throw new Error(`Insufficient EDG balance. This wallet has ${available} EDG and needs ${shortfall} more EDG.`);
      }
      if (bnbBalance === 0n) {
        throw new Error("Add a small amount of BNB to this wallet to pay the BNB Smart Chain network fee.");
      }
      setMessage(`Confirm the transfer of ${Number(EDG_AMOUNT).toLocaleString()} EDG in your wallet...`);
      const transaction = await token.transfer(EDG_ADMIN_WALLET, requiredEdg);
      setMessage("Transaction submitted. Waiting for BNB Smart Chain confirmation...");
      const receipt = await transaction.wait();
      if (!receipt || receipt.status !== 1) throw new Error("The EDG transfer was not confirmed.");
      localStorage.setItem("evaporatorPackagePaid", `EDG-${transaction.hash}`);
      setPaymentStatus("paid");
      setMessage("5,000 EDG payment confirmed on BNB Smart Chain. Your professional BEP is unlocked.");
    } catch (error) {
      setPaymentStatus("idle");
      const providerMessage = error.shortMessage || error.reason || error.message || "";
      setMessage(
        /insufficient funds/i.test(providerMessage)
          ? "Insufficient BNB for the network fee. Add a small amount of BNB and try again."
          : /execution reverted|unknown custom error|call exception/i.test(providerMessage)
            ? "The EDG contract rejected this transfer. Confirm this wallet holds at least 5,000 transferable EDG, then try again."
            : providerMessage || "EDG payment was cancelled."
      );
    }
  }

  return (
    <main className="ev-page">
      <section className="ev-hero">
        <div className="ev-hero-copy">
          <span className="ev-kicker">Industrial wastewater treatment · MVR technology</span>
          <h1>Best Energy Efficient MVR Evaporator Design.</h1>
          <p>Simulate a 1–5 TPH industrial wastewater MVR evaporator with a live process flow diagram, heat and mass balance, energy demand, equipment sizing, 3D plant concept and budgetary CAPEX. Purchase the controlled Basic Engineering Package for detailed engineering schedules.</p>
          <div className="ev-flow"><span><b>01</b> Feed basis</span><span><b>02</b> Review plant</span><span><b>03</b> Download BEP</span></div>
        </div>
        <div className="ev-input-card">
          <div className="ev-card-heading"><div><small>COMMERCIAL PLANT DESIGN</small><h2>Process basis</h2></div><span>1–5 TPH</span></div>
          <button className="ev-reference" onClick={() => { setInputs(DEFAULTS); setGenerated(true); setTab("pfd"); }}>
            <strong>1 TPH</strong><span><b>24 TPD standard design basis</b><small>≈ 24 KLD at 1,000 kg/m³ · 24 h/day</small></span><i>Use →</i>
          </button>
          <div className="ev-primary-inputs">
            <label>HOURLY FEED CAPACITY <span><select value={inputs.capacityTph} onChange={(event) => update("capacityTph", Number(event.target.value))}>{[1, 2, 3, 4, 5].map((capacity) => <option key={capacity} value={capacity}>{capacity} TPH</option>)}</select></span><small className="ev-field-note">Integer selection only · {design.inputs.dailyThroughputTpd} tonnes/day</small></label>
            <label>FEED CONCENTRATION <span><input type="number" min="0.2" max="35" step="0.1" value={inputs.feedConc} onChange={(event) => update("feedConc", event.target.value)} onBlur={enforce("feedConc", .2, 35)} /> %</span><small className="ev-field-note">Range 0.2–35% by mass</small></label>
            <label>MAXIMUM DESIGN CONCENTRATION <span><input type="number" min="1" max="60" step="0.5" value={inputs.finalConc} onChange={(event) => update("finalConc", event.target.value)} onBlur={enforce("finalConc", Math.min(59.5, design.inputs.feedConc + .5), 60)} /> %</span><small className="ev-field-note">Must exceed feed · confirm with laboratory data</small></label>
          </div>
          <details className="ev-advanced">
            <summary>Operating conditions <span>Optional · live</span></summary>
            <div className="ev-operating-inputs">
              <Field label="Feed temperature" value={inputs.feedTemp} unit="°C" note="Sensible duty" min="5" max="85" step="1" onChange={(v) => update("feedTemp", v)} />
              <Field label="Feed density" value={inputs.density} unit="kg/m³" note="Flow and KLD" min="850" max="1400" step="10" onChange={(v) => update("density", v)} />
              <Field label="Operating hours" value={inputs.operatingHours} unit="h/day" note="Daily throughput" min="16" max="24" step="1" onChange={(v) => update("operatingHours", v)} />
              <Field label="Boiling temperature" value={inputs.boilingTemp} unit="°C" note="Vacuum and duty" min={Math.min(90, Math.max(45, Number(inputs.feedTemp) + 5))} max="90" step="1" onChange={(v) => update("boilingTemp", v)} />
            </div>
            <details className="ev-expert-settings">
              <summary>Engineering model settings <span>Use defaults unless verified</span></summary>
              <div>
                <Field label="MVR heat lift" value={inputs.heatLift} unit="K" note="Power and area" min="5" max="15" step="0.5" onChange={(v) => update("heatLift", v)} />
                <Field label="Compressor efficiency" value={inputs.compressorEfficiency} unit="%" note="MVR absorbed power" min="55" max="85" step="1" onChange={(v) => update("compressorEfficiency", v)} />
                <Field label="Heat recovery efficiency" value={inputs.heatRecovery} unit="%" note="External heat" min="70" max="96" step="1" onChange={(v) => update("heatRecovery", v)} />
                <Field label="Overall U value" value={inputs.uValue} unit="W/m²K" note="Heat-transfer area" min="650" max="2500" step="50" onChange={(v) => update("uValue", v)} />
                <Field label="USD / INR exchange" value={inputs.exchangeRateInrUsd} unit="INR/USD" note="Budget conversion" min="60" max="120" step="1" onChange={(v) => update("exchangeRateInrUsd", v)} />
              </div>
            </details>
            <details className="ev-expert-settings">
              <summary>Client and project details</summary>
              <div>
                <TextField label="Client name" value={inputs.clientName} onChange={(v) => update("clientName", v)} />
                <TextField label="Project name" value={inputs.projectName} onChange={(v) => update("projectName", v)} />
                <TextField label="Project location" value={inputs.projectLocation} onChange={(v) => update("projectLocation", v)} />
              </div>
            </details>
            <p className="ev-live-assumption">Live result: <b>{design.massBalance.evaporationKgH} kg/h evaporation</b><span>{design.inputs.dailyFeedKld.toFixed(2)} KLD at {design.inputs.density} kg/m³</span><span>{design.thermal.externalHeatKw} kW external heat</span><span>{design.thermal.compressorPowerKw} kW MVR power</span><span>{design.thermal.designAreaM2} m² area</span></p>
          </details>
          <div className="ev-simulator-control"><span><i /> LIVE SIMULATION</span><small>Mass balance closed at {design.massBalance.closureKgH} kg/h · inputs protected by preliminary design limits.</small><button type="button" onClick={() => { setInputs(DEFAULTS); setGenerated(true); setTab("pfd"); setMessage(""); }}>Reset design basis</button></div>
        </div>
      </section>

      {generated && (
        <section className="ev-results">
          <div className="ev-summary-head">
            <div><span className="ev-kicker">Preliminary basic engineering package</span><h2>{design.inputs.capacityTph} TPH MVR evaporator</h2><p>{design.inputs.dailyThroughputTpd} TPD · {design.inputs.dailyFeedKld.toFixed(1)} KLD at stated density · {design.inputs.feedConc}% to {design.inputs.finalConc}%.</p></div>
            <div className="ev-kpis">
              <span><small>EVAPORATION</small><b>{design.massBalance.evaporationKgH}</b><em>kg/h</em></span>
              <span><small>HEAT AREA</small><b>{design.thermal.designAreaM2}</b><em>m²</em></span>
              <span><small>MVR POWER</small><b>{design.thermal.compressorPowerKw}</b><em>kW</em></span>
              <span><small>TOTAL ABSORBED</small><b>{design.thermal.totalAbsorbedPowerKw}</b><em>kW</em></span>
              <span><small>CONNECTED LOAD</small><b>{design.thermal.totalConnectedPowerKw}</b><em>kW</em></span>
              <span><small>WATER RECOVERY</small><b>{design.massBalance.waterRecoveryPct}</b><em>%</em></span>
            </div>
          </div>
          <div className="ev-tabs">
            {[["pfd", "PFD", false], ["3d", "3D plant", false], ["cost", "Budget estimate", false], ["operation", "Operating overview", true], ["balance", "Detailed HMBD", true], ["equipment", "Equipment schedule", true], ["lines", "Lines & valves", true]].map(([key, label, locked]) => (
              <button key={key} className={`${tab === key ? "active" : ""} ${locked ? "locked" : ""}`} onClick={() => setTab(key)}>{locked && <span aria-hidden="true">🔒</span>}{label}</button>
            ))}
          </div>
          <div className="ev-workspace">
            <div className="ev-main-panel">
              {tab === "3d" && <EvaporatorModel3D design={design} />}
              {tab === "operation" && <LockedPreview title="Operating overview" description="Design setpoints, equipment duties, pressures, temperatures, control philosophy, alarms and operating envelope." />}
              {tab === "pfd" && <EvaporatorPfd ref={pfdRef} design={design} />}
              {tab === "balance" && <LockedPreview title="Heat & mass balance" description="Auditable stream-by-stream feed, vapor, condensate, concentrate, solids, thermal duty and energy balance." />}
              {tab === "equipment" && <LockedPreview title="Equipment schedule" description="Tagged process equipment, design duties, capacities, selected motors, materials and preliminary specifications." />}
              {tab === "lines" && <LockedPreview title="Line & valve schedules" description="Line numbers, services, pipe sizes, velocities, materials, valve tags, types and control functions." />}
              {tab === "cost" && <CostEstimate design={design} />}
              {tab !== "pfd" && <div className="ev-hidden-pfd"><EvaporatorPfd ref={pfdRef} design={design} /></div>}
            </div>
            <aside className="ev-package-card">
              <small>PROFESSIONAL BEP · SECURE CHECKOUT</small>
              <h3>Complete engineering package</h3>
              <ul>
                <li>Controlled client document cover</li><li>Branded design report</li><li>Professional Excel workbook</li><li>Budgetary CAPEX estimate</li>
                <li>Detailed preliminary P&amp;ID</li><li>Stream heat &amp; mass balance</li><li>Equipment, line and valve schedules</li><li>Editable concept 3D model (.OBJ)</li><li>Design data JSON</li>
              </ul>
              <div className="ev-payment-choice">
                <button className={payment === "BNB" ? "active" : ""} onClick={() => setPayment("BNB")}><i className="bnb">◆</i><b>BNB</b><small>Live $100 equivalent</small></button>
                <button className={payment === "EDG" ? "active" : ""} onClick={() => { setPayment("EDG"); setMessage(""); }}><i className="edg"><img src="/assets/edg_logo.svg" alt="EDG" /></i><b>EDG</b><small>5,000 EDG</small></button>
              </div>
              <div className="ev-price"><span>Production BEP</span><b>{payment === "EDG" ? `${Number(EDG_AMOUNT).toLocaleString()} EDG` : `$${EVAPORATOR_PRICE_USD}`} <small>{payment === "EDG" ? `≈ ${edgLive.bnb.toFixed(3)} BNB` : "USD equivalent"}</small></b><em>{payment === "BNB" ? "BNB on BSC · NOWPayments secure checkout" : `Live BNB Chain price${edgLive.stage ? ` · presale stage ${edgLive.stage}` : ""} · refreshed every 60 seconds`}</em></div>
              {paymentStatus === "paid"
                ? <button className="ev-download" onClick={downloadLocalPackage}>Download professional BEP ↓</button>
                : <button className="ev-download" disabled={paymentStatus === "pending"} onClick={payment === "EDG" ? payWithEdg : startBnbGateway}>{paymentStatus === "pending" ? "Confirming payment..." : payment === "EDG" ? "Pay 5,000 EDG with MetaMask" : "Pay securely with BNB · $100"}</button>}
              {message && <p className="ev-message">{message}</p>}
              <p className="ev-private-note">Detailed operating overview, stream balance, equipment schedule, line list and valve list are included only in the purchased BEP.</p>
              <p className="ev-safety">Preliminary design only. Final mechanical, process safety, structural, electrical and statutory design requires licensed professional review.</p>
            </aside>
          </div>
          <AiReview design={design} />
          <div className="ev-warnings">{design.warnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}</div>
        </section>
      )}
      <section className="ev-seo-content" aria-labelledby="ev-seo-title">
        <span className="ev-kicker">MVR PROCESS ENGINEERING</span>
        <h2 id="ev-seo-title">Industrial wastewater MVR evaporator design simulator</h2>
        <p>Engineering Drawing provides a browser-based preliminary design workflow for mechanical vapor recompression evaporators from 1 to 5 tonnes per hour. Enter feed concentration, target concentrate, density and operating conditions to calculate live stream flows, water recovery, thermal duty, compressor power, heat-transfer area and daily plant capacity.</p>
        <div>
          <article><h3>Live heat and mass balance</h3><p>Track wastewater feed, dry solids, vapor, distillate and concentrate with a continuously checked mass-balance closure.</p></article>
          <article><h3>Dimensioned 3D plant arrangement</h3><p>Review capacity-dependent process trains, vessels, pumps, MVR equipment, pipe rack, platforms, access steel and preliminary general-arrangement dimensions.</p></article>
          <article><h3>Professional basic engineering package</h3><p>Generate controlled process documentation including the PFD, calculation workbook, equipment and pump schedules, line and valve lists, instrument index, utility summary and Class 4 cost estimate.</p></article>
        </div>
        <p className="ev-seo-note">Results are preliminary engineering estimates. Final guarantees, material selection, pressure design, HAZOP, statutory compliance and fabrication documents require project-specific laboratory data and authorized professional review.</p>
      </section>
    </main>
  );
}

function AiReview({ design }) {
  const notes = [
    `Mass balance closes: ${design.massBalance.feedKgH} kg/h feed = ${design.massBalance.productKgH} kg/h concentrate + ${design.massBalance.evaporationKgH} kg/h vapor.`,
    `Thermodynamic MVR duty is ${design.thermal.compressorPowerKw} kW; pumps add ${design.thermal.auxiliaryPowerKw} kW, giving ${design.thermal.totalAbsorbedPowerKw} kW estimated running load.`,
    design.inputs.finalConc >= 30
      ? "High-solids duty needs viscosity, boiling-point elevation and fouling data before vendor issue."
      : "Concentration is within the preliminary design envelope; confirm product thermophysical data before vendor issue.",
  ];
  return <div className="ev-ai-review"><div><span>AI ENGINEERING REVIEW</span><b>Calculation-led design check</b></div><ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul></div>;
}

function Field({ label, value, unit, note, min, max, step, onChange }) {
  const normalize = (event) => {
    const number = Number(event.target.value);
    if (Number.isFinite(number)) onChange(Math.min(Number(max), Math.max(Number(min), number)));
  };
  return <label>{label}<small className="ev-input-impact">{note} · {min}–{max}</small><span><input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} onBlur={normalize} /> {unit}</span></label>;
}
function TextField({ label, value, onChange }) {
  return <label>{label}<span><input type="text" value={value} onChange={(event) => onChange(event.target.value)} /></span></label>;
}

function CostEstimate({ design }) {
  const rows = [
    ...design.cost.items.map((item) => [item.item, `$${item.usd.toLocaleString()}`, `₹${Math.round(item.usd * design.cost.exchangeRateInrUsd).toLocaleString()}`]),
    ["Contingency (15%)", `$${design.cost.contingencyUsd.toLocaleString()}`, `₹${Math.round(design.cost.contingencyUsd * design.cost.exchangeRateInrUsd).toLocaleString()}`],
    ["TOTAL INSTALLED COST", `$${design.cost.totalInstalledUsd.toLocaleString()}`, `₹${design.cost.totalInstalledInr.toLocaleString()}`],
  ];
  return <div className="ev-cost-panel"><div className="ev-cost-head"><div><small>BUDGETARY CAPEX</small><b>${design.cost.totalInstalledUsd.toLocaleString()}</b></div><div><small>INDICATIVE INR</small><b>₹{design.cost.totalInstalledInr.toLocaleString()}</b></div></div><DataTable columns={["Cost element", "USD", "INR"]} rows={rows} /><p><b>{design.cost.accuracy}.</b> {design.cost.exclusions}</p></div>;
}

function LockedPreview({ title, description }) {
  return <div className="ev-locked-preview"><div className="ev-lock-icon">🔒</div><small>INCLUDED IN PROFESSIONAL BEP</small><h3>{title}</h3><p>{description}</p><div className="ev-locked-rows">{[1,2,3,4].map((row) => <span key={row} />)}</div><button type="button" onClick={() => document.querySelector(".ev-package-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Unlock complete engineering package · $100</button></div>;
}

function OperatingOverview({ design }) {
  const points = [
    ["Feed flow", design.massBalance.feedM3h, "m³/h"], ["Feed temperature", design.inputs.feedTemp, "°C"],
    ["Body temperature", design.inputs.boilingTemp, "°C"], ["Body pressure", design.thermal.suctionPressureKpa, "kPa abs"],
    ["Booster discharge", design.thermal.dischargePressureKpa, "kPa abs"], ["MVR heat lift", design.inputs.heatLift, "K"],
    ["Condensate flow", design.massBalance.condensateM3h, "m³/h"], ["Reject flow", design.massBalance.productM3h, "m³/h"],
    ["Water recovery", design.massBalance.waterRecoveryPct, "%"], ["Total absorbed power", design.thermal.totalAbsorbedPowerKw, "kW"],
  ];
  return <div className="ev-hmi"><div className="ev-hmi-head"><div><small>DESIGN-POINT OPERATING OVERVIEW</small><b>{design.inputs.clientName}</b></div><span>NOT LIVE · PRELIMINARY SETPOINTS</span></div><div className="ev-hmi-grid">{points.map(([label,value,unit]) => <div key={label}><small>{label}</small><b>{value}</b><em>{unit}</em></div>)}</div><div className="ev-hmi-status">{["Feed pump P-106", "Recirculation P-101", "MVR booster B-101", "Vacuum pump P-104", "Condensate pump P-105", "Reject pump P-107"].map((item) => <span key={item}><i />{item}<b>DESIGN DUTY</b></span>)}</div><p>This screen presents the calculated engineering operating envelope. PLC interlocks, alarms, permissives and live values require controls integration and site commissioning.</p></div>;
}

function Balance({ design }) {
  const rows = [
    ["S-01 Industrial wastewater feed", design.massBalance.feedKgH, "kg/h"], ["Feed volumetric flow", design.massBalance.feedM3h, "m³/h"],
    ["Feed dissolved/total solids", design.massBalance.solidsKgH, "kg/h"], ["Daily solids load", design.massBalance.tdsLoadKgDay, "kg/day"],
    ["S-07 Concentrate/reject", design.massBalance.productKgH, "kg/h"], ["Concentrate volumetric flow", design.massBalance.productM3h, "m³/h"],
    ["Daily reject volume", design.massBalance.rejectLDay, "L/day"], ["S-06 Vapor/condensate", design.massBalance.evaporationKgH, "kg/h"],
    ["Condensate flow", design.massBalance.condensateM3h, "m³/h"], ["Water recovery", design.massBalance.waterRecoveryPct, "%"],
    ["Concentration ratio", design.massBalance.concentrationRatio, "x"], ["Mass balance closure", design.massBalance.closureKgH, "kg/h"],
    ["Sensible heat", design.thermal.sensibleKw, "kW"], ["Latent heat", design.thermal.latentKw, "kW"],
    ["External heat", design.thermal.externalHeatKw, "kW"], ["Specific MVR energy", design.thermal.specificEnergyKwhT, "kWh/t evaporation"],
    ["MVR compressor absorbed power", design.thermal.compressorPowerKw, "kW"], ["MVR selected motor", design.thermal.compressorMotorKw, "kW"],
    ["Pump auxiliary absorbed power", design.thermal.auxiliaryPowerKw, "kW"], ["Total plant absorbed power", design.thermal.totalAbsorbedPowerKw, "kW"],
    ["Total connected motor load", design.thermal.totalConnectedPowerKw, "kW"], ["Total specific electricity", design.thermal.specificPlantEnergyKwhT, "kWh/t evaporation"],
    ["MVR suction pressure", design.thermal.suctionPressureKpa, "kPa abs"], ["MVR discharge pressure", design.thermal.dischargePressureKpa, "kPa abs"],
  ];
  return <DataTable columns={["Design result", "Value", "Unit"]} rows={rows} />;
}

function LinesValves({ design }) {
  return <div className="ev-stack"><DataTable columns={["Line", "Service", "Size", "Schedule", "Material", "Flow", "Velocity"]} rows={design.lines.map((item) => [item.lineNo, item.service, item.size, item.schedule, item.material, `${item.flowM3h} m³/h`, `${item.velocity} m/s`])} /><DataTable columns={["Valve", "Service", "Size", "Type", "Material"]} rows={design.valves.map((item) => [item.tag, item.service, item.size, item.type, item.material])} /></div>;
}

void OperatingOverview;
void Balance;
void LinesValves;

function DataTable({ columns, rows }) {
  return <div className="ev-table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

const EvaporatorPfd = React.forwardRef(({ design }, ref) => {
  const feed = design.massBalance.feedKgH;
  const vapor = design.massBalance.evaporationKgH;
  const product = design.massBalance.productKgH;
  const effectCount = design.plantLayout.bodyTags.length;
  const trainStart = 520;
  const trainWidth = 440;
  const trainGap = 8;
  const effectWidth = (trainWidth - trainGap * (effectCount - 1)) / effectCount;
  const effectX = (index) => trainStart + index * (effectWidth + trainGap);
  const lastEffectCenter = effectX(effectCount - 1) + effectWidth / 2;
  return (
    <div className="ev-pfd-shell">
      <div className="ev-pfd-title"><b>Process Flow Diagram (PFD)</b><span>{design.inputs.capacityTph} TPH · {design.inputs.dailyFeedKld.toFixed(2)} KLD · density {design.inputs.density} kg/m³</span></div>
      <div className="ev-hmb-live" aria-live="polite">
        <div className="ev-hmb-heading"><span><i /> LIVE HEAT &amp; MASS BALANCE</span><small>{design.inputs.capacityTph} TPH · {design.inputs.feedConc}% → {design.inputs.finalConc}% solids · density {design.inputs.density} kg/m³ · {design.inputs.operatingHours} h/day</small></div>
        <div className="ev-hmb-grid" data-simulation-revision={`${design.inputs.capacityTph}-${design.inputs.feedConc}-${design.inputs.finalConc}-${design.inputs.density}-${design.inputs.feedTemp}-${design.inputs.boilingTemp}-${design.inputs.heatLift}-${design.inputs.compressorEfficiency}-${design.inputs.heatRecovery}`}>
          <article className="density-card" data-drivers="capacity,density,operatingHours"><small>S-01 FEED VOLUME</small><b>{design.massBalance.feedM3h} m³/h</b><span>{feed} kg/h ÷ {design.inputs.density} kg/m³</span><span>{design.inputs.dailyFeedKld.toFixed(2)} KLD · {design.inputs.operatingHours} h/day</span></article>
          <article data-drivers="capacity,feedConc,finalConc"><small>S-05 VAPOR / DISTILLATE</small><b>{vapor} kg/h</b><span>{design.massBalance.condensateM3h} m³/h · {design.massBalance.waterRecoveryPct}% recovery</span></article>
          <article data-drivers="capacity,feedConc,finalConc,density"><small>S-07 CONCENTRATE</small><b>{product} kg/h</b><span>{design.massBalance.productM3h} m³/h · {design.inputs.finalConc}% solids</span></article>
          <article data-drivers="feed,evaporation,feedTemp,boilingTemp,heatRecovery"><small>HEAT DUTY</small><b>{design.thermal.latentKw} kW</b><span>{design.thermal.sensibleKw} kW sensible · {design.thermal.externalHeatKw} kW external</span></article>
          <article data-drivers="evaporation,boilingTemp,heatLift,compressorEfficiency"><small>MVR ENERGY</small><b>{design.thermal.compressorPowerKw} kW</b><span>{design.thermal.specificEnergyKwhT} kWh/t vapor · ΔT {design.inputs.heatLift} K</span></article>
          <article data-drivers="feed,concentrate,vapor"><small>BALANCE CLOSURE</small><b>{design.massBalance.closureKgH} kg/h</b><span>{feed} = {product} + {vapor} kg/h</span></article>
        </div>
      </div>
      <div className="ev-capacity-basis"><b>{design.plantLayout.basis}</b><span>{effectCount} evaporator {effectCount === 1 ? "body" : "bodies"}</span><span>{design.plantLayout.heaterTags.length} heater train(s)</span><span>{design.plantLayout.recirculationPumps} recirculation pump(s)</span><span>{design.plantLayout.boosterCount} booster(s){design.plantLayout.blowerCount ? ` + ${design.plantLayout.blowerCount} blower` : ""}</span></div>
      <svg ref={ref} viewBox="0 0 1200 700" role="img" aria-label="Industrial wastewater MVR evaporator piping and instrumentation diagram">
        <defs>
          {["green", "red", "blue", "purple", "amber", "gray"].map((color) => <marker key={color} id={`ev-arrow-${color}`} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" className={`fill-${color}`} /></marker>)}
        </defs>
        <PfdUnit x={55} y={245} w={145} h={105} title="WW feed tank" tag="TK-101" />
        <PfdPump x={235} y={280} tag="P-106 A/B" />
        <PfdUnit x={345} y={245} w={155} h={105} title="Preheater" tag="E-101" />
        {design.plantLayout.bodyTags.map((tag, index) => <PfdUnit key={tag} x={effectX(index)} y={210 - (index % 2) * 18} w={effectWidth} h={190 + (index % 2) * 18} title={index === effectCount - 1 && effectCount >= 3 ? "Finisher" : `Effect ${index + 1}`} tag={`${tag} / ${design.plantLayout.heaterTags[index]}`} />)}
        <PfdUnit x={810} y={35} w={170} h={90} title="MVR booster" tag="B-101" />
        <PfdUnit x={1010} y={175} w={135} h={80} title="DCH / NCG" tag="E-102" />
        <PfdUnit x={1005} y={455} w={145} h={100} title="Condensate tank" tag="TK-111" />
        <PfdPump x={520} y={465} tag="P-107" />
        <PfdPump x={965} y={425} tag="P-105" />
        {design.plantLayout.bodyTags.map((tag, index) => <PfdPump key={`pump-${tag}`} x={effectX(index) + effectWidth / 2 - 20} y={430 + (index % 2) * 8} tag={`P-${101 + index}`} />)}
        <PfdPump x={1080} y={280} tag="P-104 VAC" />
        <path className="stream green" markerEnd="url(#ev-arrow-green)" d={`M200 300 H235 M275 300 H345 M500 300 H${trainStart}`} />
        {design.plantLayout.bodyTags.slice(0, -1).map((tag, index) => <path key={`transfer-${tag}`} className="stream green" markerEnd="url(#ev-arrow-green)" d={`M${effectX(index) + effectWidth} ${305 - (index % 2) * 18} H${effectX(index + 1)}`} />)}
        <path className="stream red" markerEnd="url(#ev-arrow-red)" d={`M${lastEffectCenter} ${192 - ((effectCount - 1) % 2) * 18} V125 H895`} />
        <path className="stream red" markerEnd="url(#ev-arrow-red)" d="M980 80 H1080 V250 H960" />
        {design.plantLayout.bodyTags.map((tag, index) => <path key={`recirc-${tag}`} className="stream amber" markerEnd="url(#ev-arrow-amber)" d={`M${effectX(index) + effectWidth * .7} 400 V450 H${effectX(index) + effectWidth / 2} V${382 + (index % 2) * 18}`} />)}
        <path className="stream purple" markerEnd="url(#ev-arrow-purple)" d={`M${effectX(effectCount - 1)} 365 H${Math.max(560, effectX(effectCount - 1) - 35)} V520 H560`} />
        <path className="stream blue" markerEnd="url(#ev-arrow-blue)" d="M960 350 H1040 V425 H1005 M1005 445 V505" />
        <path className="stream gray" markerEnd="url(#ev-arrow-gray)" d="M960 240 H1010 M1078 255 V280" />
        <Instrument x={150} y={390} tag="FIT-101" /><Instrument x={430} y={210} tag="TIT-101" />
        <Instrument x={785} y={290} tag="LIT-101" /><Instrument x={890} y={145} tag="PIT-101" />
        <Instrument x={1080} y={395} tag="CIT-101" />
        <text x="75" y="225">S-01 · {feed} kg/h wastewater</text><text x="815" y="155">S-05 · {vapor} kg/h vapor</text><text x="390" y="540">S-07 · {product} kg/h concentrate / reject out</text>
        <text x="70" y="590" className="pfd-note">Live preliminary PFD · green feed · red vapor · blue condensate · purple concentrate · values update from simulation inputs</text>
        <g className="pfd-title-block">
          <rect x="55" y="615" width="1090" height="68" />
          <line x1="760" y1="615" x2="760" y2="683" /><line x1="930" y1="615" x2="930" y2="683" />
          <line x1="55" y1="648" x2="1145" y2="648" />
          <text x="70" y="637" className="pfd-company">ENGINEERING DRAWING</text>
          <text x="70" y="670">Project: {design.inputs.projectName} · Client: {design.inputs.clientName} · Location: {design.inputs.projectLocation}</text>
          <text x="775" y="637">Document: ED-MVR-PFD-001</text><text x="775" y="670">Status: PRELIMINARY / NOT FOR CONSTRUCTION</text>
          <text x="945" y="637">Rev: P01 · Date: {new Date().toISOString().slice(0, 10)}</text><text x="945" y="670">Prepared: Engineering Drawing · Checked: Pending</text>
        </g>
      </svg>
    </div>
  );
});

function PfdUnit({ x, y, w, h, title, tag }) {
  return <g><rect x={x} y={y} width={w} height={h} rx="14" className="pfd-unit" /><text x={x + w / 2} y={y + 35} textAnchor="middle" className="pfd-title">{title}</text><text x={x + w / 2} y={y + h - 18} textAnchor="middle" className="pfd-tag">{tag}</text></g>;
}
function PfdPump({ x, y, tag }) {
  return <g><circle cx={x + 20} cy={y + 20} r="20" className="pfd-pump" /><path d={`M${x + 8} ${y + 28} L${x + 31} ${y + 20} L${x + 8} ${y + 12} Z`} /><text x={x + 20} y={y + 58} textAnchor="middle" className="pfd-tag">{tag}</text></g>;
}
function Instrument({ x, y, tag }) {
  return <g><circle cx={x} cy={y} r="19" className="pfd-instrument" /><text x={x} y={y + 4} textAnchor="middle" className="pfd-inst-text">{tag}</text></g>;
}
