import React, { useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, parseUnits } from "ethers";
import ReactorPlant3D from "./ReactorPlant3D";
import { calculateReactorDesign, REACTOR_PRESETS } from "./reactorDesignEngine";
import { createReactorPackage } from "./downloadPackage";
import tokenMeta from "../../EnggDrawTokenABI.json";
import "./ReactorSimulator.css";

const DEFAULTS = { preset:"pharma", ...REACTOR_PRESETS.pharma, projectName:"Pharmaceutical API Intermediate Reactor", clientName:"Client / End User" };
const configuredApiBase=process.env.REACT_APP_API_BASE_URL||"";
const API_BASE=/^https?:\/\//.test(configuredApiBase)&&!configuredApiBase.includes("localhost")?configuredApiBase.replace(/\/$/,""):"";
const EDG_ADMIN_WALLET="0xD9738cc53E9746a01cAC8EF01aF17fF4e88DD25F";
const EDG_ABI=["function balanceOf(address) view returns (uint256)","function transfer(address,uint256) returns (bool)"];

const number = (value) => Number(value);
const money = (value) => Number(value).toLocaleString("en-US");

export default function ReactorSimulator() {
  const [inputs,setInputs]=useState(DEFAULTS);
  const [tab,setTab]=useState("pfd");
  const [payment,setPayment]=useState("BNB");
  const [paymentStatus,setPaymentStatus]=useState(localStorage.getItem("reactorPackagePaid")?"paid":"idle");
  const [message,setMessage]=useState("");
  const pfdRef=useRef(null);
  const design=useMemo(()=>calculateReactorDesign(inputs),[inputs]);
  const update=(key,value)=>{setInputs(current=>({...current,[key]:value}));setTab("pfd");};
  const reset=()=>{setInputs(DEFAULTS);setTab("pfd");};
  const applyPreset=(key)=>{setInputs(current=>({...current,preset:key,...REACTOR_PRESETS[key]}));setTab("pfd");};
  useEffect(()=>{
    const query=new URLSearchParams(window.location.search),result=query.get("payment");
    const order=query.get("order")||localStorage.getItem("reactorPaymentOrder");
    if(result==="cancelled"){setMessage("Payment cancelled; your simulation is preserved.");window.history.replaceState({},"",window.location.pathname);return undefined;}
    if(result!=="return"||!order)return undefined;
    setPaymentStatus("pending");setMessage("Checking secure payment status...");
    let stopped=false,attempts=0;
    const check=async()=>{attempts+=1;try{const response=await fetch(`${API_BASE}/api/payments/nowpayments/status/${encodeURIComponent(order)}`);const body=await response.json();if(!response.ok)throw new Error(body.error);if(body.status==="finished"){localStorage.setItem("reactorPackagePaid",`NOWPAYMENTS-${order}`);setPaymentStatus("paid");setMessage("Payment confirmed. Professional reactor BEP unlocked.");window.history.replaceState({},"",window.location.pathname);return;}if(["failed","expired","refunded"].includes(body.status)){setPaymentStatus("idle");setMessage(`Payment ${body.status}.`);return;}if(!stopped&&attempts<30)window.setTimeout(check,4000);}catch(error){setPaymentStatus("idle");setMessage(error.message||"Could not verify payment.");}};
    check();return()=>{stopped=true;};
  },[]);
  async function startBnb(){
    setPaymentStatus("pending");setMessage("");
    try{const response=await fetch(`${API_BASE}/api/payments/nowpayments/reactor/invoice`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({design:{capacity:design.inputs.capacity,type:design.inputs.type}})});const body=await response.json();if(!response.ok||!body.invoiceUrl)throw new Error(body.error||"Could not create checkout.");localStorage.setItem("reactorPaymentOrder",body.orderId);window.location.assign(body.invoiceUrl);}catch(error){setPaymentStatus("idle");setMessage(error.message||"Could not open checkout.");}
  }
  async function payEdg(){
    if(!window.ethereum){setMessage("Install MetaMask or open this page in its wallet browser.");return;}
    setPaymentStatus("pending");setMessage("");
    try{await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:"0x38"}]});const provider=new BrowserProvider(window.ethereum);const signer=await provider.getSigner();const buyer=await signer.getAddress();const token=new Contract(tokenMeta.ADDRESS,EDG_ABI,signer);const amount=parseUnits("5000",18);const [balance,gas]=await Promise.all([token.balanceOf(buyer),provider.getBalance(buyer)]);if(balance<amount)throw new Error("This wallet needs at least 5,000 transferable EDG.");if(gas===0n)throw new Error("Add a small amount of BNB for the network fee.");const tx=await token.transfer(EDG_ADMIN_WALLET,amount);setMessage("Waiting for BNB Smart Chain confirmation...");const receipt=await tx.wait();if(receipt.status!==1)throw new Error("Transfer was not confirmed.");localStorage.setItem("reactorPackagePaid",`EDG-${tx.hash}`);setPaymentStatus("paid");setMessage("5,000 EDG confirmed. Professional reactor BEP unlocked.");}catch(error){setPaymentStatus("idle");setMessage(error.shortMessage||error.reason||error.message||"Payment cancelled.");}
  }
  function downloadPackage(){
    const svg=pfdRef.current?new XMLSerializer().serializeToString(pfdRef.current):"<svg xmlns='http://www.w3.org/2000/svg'/>";
    const blob=createReactorPackage(design,svg),url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download=`engineering-drawing-reactor-${design.inputs.capacity}-${design.inputs.type.toLowerCase()}-bep.zip`;link.click();URL.revokeObjectURL(url);
  }
  return <main className="rx-page">
    <section className="rx-hero">
      <div className="rx-copy">
        <span className="rx-kicker">REACTION ENGINEERING · LIVE PRELIMINARY DESIGN</span>
        <h1>Industrial reactor design simulator</h1>
        <p>Size batch, CSTR and PFR reaction systems with live kinetics, vessel geometry, heat duty, agitation, utilities, piping, budget and an interactive 3D plant arrangement.</p>
        <div className="rx-flow"><span><b>01</b> Process basis</span><span><b>02</b> Simulate reactor</span><span><b>03</b> Review plant</span></div>
      </div>
      <div className="rx-input-card">
        <div className="rx-card-head"><div><small>COMMERCIAL CONCEPT DESIGN</small><h2>Reactor basis</h2></div><button onClick={reset}>Reset</button></div>
        <div className="rx-primary">
          <label>INDUSTRY REFERENCE<select value={inputs.preset} onChange={e=>applyPreset(e.target.value)}>{Object.entries(REACTOR_PRESETS).map(([key,p])=><option key={key} value={key}>{p.label}</option>)}</select><small>Illustrative basis only — replace with laboratory and batch-record data</small></label>
          <label>REACTOR TYPE<select value={inputs.type} onChange={e=>update("type",e.target.value)}><option>Batch</option><option>CSTR</option><option>PFR</option></select><small>{inputs.type==="Batch"?"Jacketed stirred batch vessel":inputs.type==="CSTR"?"Continuous stirred-tank reactor":"Tubular plug-flow reactor"}</small></label>
          <label>{inputs.type==="Batch"?"WORKING BATCH VOLUME":"FEED CAPACITY"}<span><select value={inputs.capacity} onChange={e=>update("capacity",number(e.target.value))}>{[1,2,3,4,5].map(v=><option key={v} value={v}>{v} {inputs.type==="Batch"?"m³/batch":"m³/h"}</option>)}</select></span><small>Simple 1–5 commercial design basis</small></label>
          <label>TARGET CONVERSION<span><input type="number" min="10" max="99" step="1" value={inputs.conversionPct} onChange={e=>update("conversionPct",e.target.value)}/>%</span><small>Verified kinetics required for guarantee</small></label>
        </div>
        <details className="rx-advanced">
          <summary>Process and kinetic assumptions <span>Optional · updates live</span></summary>
          <div className="rx-grid">
            <Field label="Reactant concentration" value={inputs.concentrationMolM3} unit="mol/m³" min="10" max="5000" step="10" onChange={v=>update("concentrationMolM3",v)}/>
            <Field label="Component A molecular weight" value={inputs.molecularWeightA} unit="kg/kmol" min="10" max="1000" step="1" onChange={v=>update("molecularWeightA",v)}/>
            <Field label="Component A purity" value={inputs.purityAPct} unit="%" min="1" max="100" step=".1" onChange={v=>update("purityAPct",v)}/>
            <Field label="Reagent B stoichiometry" value={inputs.stoichBPerA} unit="mol/mol A" min="0" max="5" step=".01" onChange={v=>update("stoichBPerA",v)}/>
            <Field label="Reagent B molecular weight" value={inputs.molecularWeightB} unit="kg/kmol" min="10" max="1000" step="1" onChange={v=>update("molecularWeightB",v)}/>
            <Field label="Reagent B purity" value={inputs.purityBPct} unit="%" min="1" max="100" step=".1" onChange={v=>update("purityBPct",v)}/>
            <Field label="Solvent / carrier fraction" value={inputs.solventMassPct} unit="wt%" min="0" max="95" step="1" onChange={v=>update("solventMassPct",v)}/>
            <Field label="Rate constant k" value={inputs.rateConstant} unit="basis SI" min=".000001" max="1" step=".0001" onChange={v=>update("rateConstant",v)}/>
            <Field label="Reaction order" value={inputs.reactionOrder} unit="n" min=".5" max="2" step=".1" onChange={v=>update("reactionOrder",v)}/>
            {inputs.type==="Batch"&&<Field label="Batch cycle" value={inputs.batchTimeH} unit="h" min="1" max="24" step=".5" onChange={v=>update("batchTimeH",v)}/>}
            <Field label="Feed temperature" value={inputs.feedTempC} unit="°C" min="5" max="180" step="1" onChange={v=>update("feedTempC",v)}/>
            <Field label="Reactor temperature" value={inputs.reactorTempC} unit="°C" min="10" max="220" step="1" onChange={v=>update("reactorTempC",v)}/>
            <Field label="Heat of reaction" value={inputs.heatReactionKjMol} unit="kJ/mol" min="-500" max="500" step="5" onChange={v=>update("heatReactionKjMol",v)}/>
            <Field label="Feed density" value={inputs.densityKgM3} unit="kg/m³" min="650" max="1600" step="10" onChange={v=>update("densityKgM3",v)}/>
            <Field label="Heat capacity" value={inputs.cpKjKgK} unit="kJ/kg·K" min="1" max="5" step=".1" onChange={v=>update("cpKjKgK",v)}/>
            <Field label="Viscosity" value={inputs.viscosityCp} unit="cP" min=".3" max="5000" step="1" onChange={v=>update("viscosityCp",v)}/>
          </div>
          <details>
            <summary>Heat-transfer and material settings</summary>
            <div className="rx-grid">
              <Field label="Overall U value" value={inputs.overallU} unit="W/m²K" min="100" max="1500" step="25" onChange={v=>update("overallU",v)}/>
              <Field label="Utility inlet" value={inputs.utilityInC} unit="°C" min="0" max="210" step="1" onChange={v=>update("utilityInC",v)}/>
              <Field label="Utility outlet" value={inputs.utilityOutC} unit="°C" min="1" max="220" step="1" onChange={v=>update("utilityOutC",v)}/>
              <label>Material of construction<select value={inputs.moc} onChange={e=>update("moc",e.target.value)}><option>SS316L</option><option>SS304L</option><option>Carbon steel</option><option>Duplex 2205</option><option>Hastelloy C-276</option></select></label>
            </div>
          </details>
        </details>
        <div className="rx-live"><span><i/> LIVE MODEL</span><b>{design.process.processVolumeM3} m³ process volume</b><small>{Math.abs(design.thermal.totalDutyKw)} kW thermal duty · {design.mechanical.connectedLoadKw} kW connected load</small></div>
      </div>
    </section>

    <section className="rx-results">
      <div className="rx-summary">
        <div><span className="rx-kicker">PRELIMINARY BASIC ENGINEERING</span><h2>{design.inputs.capacity} {design.inputs.type==="Batch"?"m³":"m³/h"} {design.inputs.type} reactor system</h2><p>{design.process.productionM3Day} m³/day nominal production · {design.inputs.conversionPct}% conversion · {design.inputs.moc}</p></div>
        <div className="rx-kpis">
          <Kpi name="DESIGN VOLUME" value={design.process.designVolumeM3} unit="m³"/>
          <Kpi name="HEAT DUTY" value={Math.abs(design.thermal.totalDutyKw)} unit="kW"/>
          <Kpi name="HEAT AREA" value={design.thermal.heatAreaM2} unit="m²"/>
          <Kpi name="AGITATOR" value={design.mechanical.agitatorMotorKw||"—"} unit={design.mechanical.agitatorMotorKw?"kW":"PFR"}/>
          <Kpi name="CONNECTED" value={design.mechanical.connectedLoadKw} unit="kW"/>
          <Kpi name="CAPEX" value={`$${money(design.cost.installedUsd)}`} unit="Class 4"/>
        </div>
      </div>
      <div className="rx-tabs">{[["pfd","Live PFD + balance"],["3d","3D plant"],["cost","Budget"],["details","Engineering schedules"]].map(([key,label])=><button key={key} className={tab===key?"active":""} onClick={()=>setTab(key)}>{key==="details"&&<span>🔒</span>}{label}</button>)}</div>
      <div className="rx-workspace">
        <div className="rx-main">
          {tab==="pfd"&&<ReactorPfd design={design} pfdRef={pfdRef}/>}
          {tab==="3d"&&<ReactorPlant3D design={design}/>}
          {tab==="cost"&&<CostPanel design={design}/>}
          {tab==="details"&&<LockedPanel payment={payment} setPayment={setPayment} status={paymentStatus} message={message} startBnb={startBnb} payEdg={payEdg} download={downloadPackage}/>}
        </div>
        <aside className="rx-side">
          <small>REACTOR DESIGN BASIS</small><h3>Engineering snapshot</h3>
          <dl>
            <div><dt>Reactor geometry</dt><dd>Ø {design.geometry.diameterM} × {design.geometry.totalHeightM} m</dd></div>
            <div><dt>Process line</dt><dd>{design.piping.process.nps} · {design.piping.process.velocityMS} m/s</dd></div>
            <div><dt>Utility line</dt><dd>{design.piping.utility.nps} · {design.piping.utility.velocityMS} m/s</dd></div>
            <div><dt>Feed pump</dt><dd>{design.mechanical.feedPumpKw} kW</dd></div>
            <div><dt>Utility demand</dt><dd>{design.thermal.utilityFlowM3H} m³/h</dd></div>
            <div><dt>Plant envelope</dt><dd>{design.layout.lengthM} × {design.layout.widthM} × {design.layout.heightM} m</dd></div>
          </dl>
          <button onClick={()=>setTab("details")}>Review professional deliverables</button>
          <p>Reaction kinetics, calorimetry, relief sizing, HAZOP, hazardous-area classification and code design require project-specific professional review.</p>
        </aside>
      </div>
      <div className="rx-warnings">{design.warnings.length?design.warnings.map(w=><p key={w}>⚠ {w}</p>):<p className="ok">✓ Inputs are within the preliminary simulator envelope. Confirm laboratory and safety data before vendor issue.</p>}</div>
      <section className="rx-advisor"><span className="rx-kicker">AI-ASSISTED ENGINEERING REVIEW</span><h3>Calculation-led design recommendations</h3><ul>{design.advisor.map(item=><li key={item}>{item}</li>)}</ul><p>Rule-based guidance—not autonomous process-safety approval. Confirm through laboratory development and authorized engineering review.</p></section>
    </section>
  </main>;
}

function Field({label,value,unit,min,max,step,onChange}) {
  const blur=e=>onChange(Math.min(max,Math.max(min,number(e.target.value))));
  return <label>{label}<small>{min}–{max}</small><span><input type="number" value={value} min={min} max={max} step={step} onChange={e=>onChange(e.target.value)} onBlur={blur}/>{unit}</span></label>;
}
function Kpi({name,value,unit}) { return <span><small>{name}</small><b>{value}</b><em>{unit}</em></span>; }

function ReactorPfd({design,pfdRef}) {
  const d=design;
  return <div className="rx-pfd">
    <div className="rx-pfd-head"><div><small>ED-RX-PFD-001 · REV 00</small><b>Live process flow diagram and balance</b></div><span>{d.inputs.type} · {d.inputs.capacity} {d.inputs.type==="Batch"?"m³/batch":"m³/h"}</span></div>
    <div className="rx-balance">
      <article><small>S-01 MAIN FEED</small><b>{d.process.feedKgH} kg/h</b><span>{d.process.feedVolumeM3H} m³/h · {d.inputs.feedTempC}°C</span></article>
      <article><small>S-02 REAGENT B</small><b>{d.components.bAsChargedKgH} kg/h</b><span>{d.inputs.stoichBPerA} mol B/mol A · {d.inputs.purityBPct}% purity</span></article>
      <article><small>S-05 PRODUCT</small><b>{d.process.productKgH} kg/h</b><span>closure {d.process.balanceClosureKgH} kg/h</span></article>
      <article><small>REACTION DUTY</small><b>{d.thermal.reactionDutyKw} kW</b><span>ΔH {d.inputs.heatReactionKjMol} kJ/mol</span></article>
      <article><small>TOTAL DUTY</small><b>{d.thermal.totalDutyKw} kW</b><span>{d.thermal.sensibleKw} kW sensible</span></article>
      <article><small>UTILITY</small><b>{d.thermal.utilityFlowM3H} m³/h</b><span>{d.thermal.heatAreaM2} m² transfer area</span></article>
    </div>
    <svg ref={pfdRef} viewBox="0 0 1120 550" role="img" aria-label="Live reactor process flow diagram">
      <defs><marker id="rx-arrow-g" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8z" fill="#1f9d73"/></marker><marker id="rx-arrow-p" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8z" fill="#7c4de8"/></marker><marker id="rx-arrow-b" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8z" fill="#348bd6"/></marker></defs>
      <text x="45" y="40" className="title">ENGINEERING DRAWING · REACTOR PROCESS SIMULATION</text>
      <rect x="50" y="190" width="145" height="120" rx="12" className="unit"/><text x="122" y="235" className="tag">TK-101</text><text x="122" y="260" className="name">Feed tank</text><text x="122" y="285" className="note">{d.process.feedKgH} kg/h</text>
      <circle cx="245" cy="250" r="24" className="pump"/><path d="M236 239 L259 250 L236 261z" fill="#1f2b40"/><text x="245" y="295" className="note">P-101</text>
      <rect x="315" y="205" width="145" height="90" rx="10" className="unit"/><text x="387" y="240" className="tag">E-101</text><text x="387" y="266" className="name">Preheater</text>
      {d.inputs.type==="PFR"?<g><rect x="535" y="155" width="210" height="190" rx="14" className="unit"/>{[0,1,2,3].map(i=><path key={i} d={`M565 ${190+i*38} H715`} className="tube"/>)}<text x="640" y="235" className="tag">R-101</text><text x="640" y="265" className="name">Tubular PFR</text></g>:<g><rect x="540" y="135" width="200" height="235" rx="70" className="unit"/><rect x="555" y="160" width="170" height="185" rx="55" className="jacket"/><line x1="640" y1="110" x2="640" y2="260" className="shaft"/><line x1="590" y1="260" x2="690" y2="260" className="shaft"/><rect x="610" y="75" width="60" height="50" rx="8" className="motor"/><text x="640" y="205" className="tag">R-101</text><text x="640" y="232" className="name">{d.inputs.type} reactor</text></g>}
      <rect x="860" y="190" width="165" height="120" rx="12" className="unit"/><text x="942" y="235" className="tag">TK-102</text><text x="942" y="260" className="name">Product tank</text><text x="942" y="285" className="note">{d.inputs.conversionPct}% conversion</text>
      <path d="M195 250 H221" className="feed"/><path d="M269 250 H315" className="feed"/><path d="M460 250 H535" className="feed"/><path d="M745 250 H860" className="product"/>
      <rect x="525" y="430" width="230" height="70" rx="10" className="utility"/><text x="640" y="458" className="tag">CU-101 UTILITY SKID</text><text x="640" y="482" className="note">{d.thermal.utilityFlowM3H} m³/h · {d.thermal.heatAreaM2} m²</text>
      <path d="M580 430 V370" className="util"/><path d="M700 370 V430" className="util"/>
      <path d="M640 75 V42 H820 V170" className="vent"/><text x="742" y="60" className="note">Vent / condenser connection</text>
      <text x="50" y="520" className="footer">Preliminary PFD · green feed · purple product · blue utility · values update from simulator inputs</text>
    </svg>
  </div>;
}
function CostPanel({design}) {
  const total=design.cost.installedUsd;
  const rows=[["Reactor, internals and agitator",.34],["Heat-transfer and utility skid",.19],["Pumps, piping and valves",.14],["Instrumentation and electrical",.13],["Structure, installation and engineering",.2]];
  return <div className="rx-cost"><div><small>PRELIMINARY INSTALLED CAPEX</small><b>${money(total)}</b><span>₹{money(design.cost.installedInr)}</span></div><ul>{rows.map(([name,share])=><li key={name}><span>{name}</span><b>${money(Math.round(total*share))}</b><em>₹{money(Math.round(design.cost.installedInr*share))}</em></li>)}</ul><p><b>{design.cost.accuracy}.</b> Excludes land, taxes, building, major offsites, validation, statutory fees and owner costs.</p></div>;
}
function LockedPanel({payment,setPayment,status,message,startBnb,payEdg,download}) {
  return <div className="rx-locked"><span>{status==="paid"?"✓":"🔒"}</span><small>PROFESSIONAL BASIC ENGINEERING PACKAGE</small><h3>Controlled reactor design deliverables</h3><p>Branded report, feed and heat/mass balance, equipment schedule, line basis, PFD SVG, design JSON and editable concept OBJ are supplied after payment.</p><div>{[1,2,3,4,5].map(v=><i key={v}/>)}</div>
    <section className="rx-pay"><button className={payment==="BNB"?"active":""} onClick={()=>setPayment("BNB")}>◆ BNB · $100</button><button className={payment==="EDG"?"active":""} onClick={()=>setPayment("EDG")}>◉ EDG · 5,000</button></section>
    {status==="paid"?<button onClick={download}>Download professional reactor BEP ↓</button>:<button disabled={status==="pending"} onClick={payment==="EDG"?payEdg:startBnb}>{status==="pending"?"Confirming payment...":payment==="EDG"?"Pay 5,000 EDG with MetaMask":"Pay securely with BNB · $100"}</button>}
    {message&&<p className="rx-payment-message">{message}</p>}
  </div>;
}
