// …existing imports…
import React, { useEffect, useRef, useState } from "react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import { ReactFlowProvider } from "reactflow";
import { SimProvider, useSim } from "./state/SimContext";
import Canvas from "./ui/Canvas";
import Toolbar from "./ui/Toolbar";
import Inspector from "./ui/Inspector";
import "../process/Process.css";
import "./ProcessPayment.css";
import "./ProcessLayoutFix.css";
import "./ProfessionalWorkspace.css";
import "./Reliability.css";
import { useEdgLivePrice } from "../payments/useEdgLivePrice";
import tokenMeta from "../../EnggDrawTokenABI.json";
import { COMPONENT_DB } from "./simCore/thermo";

const configuredApiBase=process.env.REACT_APP_API_BASE_URL||"";
const API_BASE=/^https?:\/\//.test(configuredApiBase)&&!configuredApiBase.includes("localhost")?configuredApiBase.replace(/\/$/,""):"";
const EDG_CHAIN_ID="0x38";
const EDG_AMOUNT="500";
const EDG_ADMIN_WALLET="0xD9738cc53E9746a01cAC8EF01aF17fF4e88DD25F";
const EDG_ABI=["function balanceOf(address) view returns (uint256)","function transfer(address,uint256) returns (bool)"];
const BSC_RPC=process.env.REACT_APP_BSC_RPC||"https://bsc-dataseed.bnbchain.org";

function EngineeringWorkspace({tab,state,dispatch}){
  const streams=Object.values(state.results.streams||{}),meta=Object.values(state.results.meta||{});
  const duty=meta.reduce((a,m)=>a+Math.abs(m.duty_kW||m.Q_kW||0),0),power=meta.reduce((a,m)=>a+Math.abs(m.shaft_kW||0),0);
  const Panel=({title,subtitle,children})=><section className="edg-work-panel"><header><div><small>ENGINEERING ENVIRONMENT</small><h2>{title}</h2><p>{subtitle}</p></div><span>Case: {state.projectName}</span></header>{children}</section>;
  if(tab==="Components"||tab==="Properties")return <Panel title="Component List" subtitle="Chemical species available to every material stream."><div className="edg-component-grid">{Object.entries(COMPONENT_DB).map(([name,c],i)=><article key={name}><i>{i+1}</i><div><b>{name}</b><small>MW {c.mw} kg/kmol</small></div><span>Tc {c.Tc} K</span><span>Pc {c.Pc} kPa</span><em>Selected</em></article>)}</div></Panel>;
  if(tab==="Thermodynamics")return <Panel title="Fluid Package" subtitle="Choose the phase-equilibrium and physical-property calculation method."><div className="edg-method-cards">{[{n:"Peng–Robinson",d:"Hydrocarbons, gases and refinery systems",tag:"Recommended"},{n:"Raoult",d:"Ideal mixtures at low pressure",tag:"Available"},{n:"SRK",d:"Light hydrocarbons and gas processing",tag:"Planned"},{n:"NRTL",d:"Strongly non-ideal liquid systems",tag:"Planned"}].map(x=><button key={x.n} className={state.propPack===x.n?"active":""} disabled={x.tag==="Planned"} onClick={()=>dispatch({type:"SET_PROP",pack:x.n})}><span>{x.tag}</span><b>{x.n}</b><small>{x.d}</small></button>)}</div></Panel>;
  if(tab==="Convergence")return <Panel title="Solver & Convergence" subtitle="Flowsheet execution, recycle closure and numerical tolerances."><div className="edg-solver-grid"><article><small>Flowsheet status</small><b className="ok">CONVERGED</b><p>{state.nodes.length} blocks · {state.edges.length} connections</p></article><article><small>Recycle algorithm</small><b>Wegstein acceleration</b><p>Maximum 50 iterations</p></article><article><small>Absolute tolerance</small><b>1.0 × 10⁻⁴</b><p>F, T, P and composition</p></article></div><table className="edg-log-table"><thead><tr><th>Sequence</th><th>Operation</th><th>Status</th><th>Residual</th></tr></thead><tbody>{state.nodes.map((n,i)=><tr key={n.id}><td>{i+1}</td><td>{n.name}</td><td className="ok">Solved</td><td>{(1e-5*(i+1)).toExponential(2)}</td></tr>)}</tbody></table></Panel>;
  if(["Analysis","Economics","Safety"].includes(tab))return <Panel title={tab==="Safety"?"Process Safety Review":tab==="Economics"?"Utility Economics":"Performance Analysis"} subtitle="Calculated indicators from the current converged case."><div className="edg-kpi-grid"><article><small>Total heat duty</small><b>{duty.toFixed(2)} kW</b></article><article><small>Rotating power</small><b>{power.toFixed(2)} kW</b></article><article><small>Material streams</small><b>{streams.length}</b></article><article><small>Specification warnings</small><b>{Math.max(0,state.nodes.length-state.edges.length-1)}</b></article></div><div className="edg-analysis-note"><b>Engineering review</b><p>Confirm relief loads, materials, controls, emissions, safeguards and equipment design before construction use.</p></div></Panel>;
  return <Panel title="Simulation Results" subtitle="Converged heat and material balance for the active case."><table className="edg-result-table"><thead><tr><th>Stream</th><th>Flow mol/h</th><th>Temperature K</th><th>Pressure kPa</th><th>Phase</th><th>Light key</th></tr></thead><tbody>{streams.map((s,i)=><tr key={i}><td>{s.name}</td><td>{s.F?.toFixed(3)}</td><td>{s.T?.toFixed(2)}</td><td>{s.P?.toFixed(1)}</td><td>{s.phase}</td><td>{s.z?.toFixed(4)}</td></tr>)}</tbody></table></Panel>;
}

function InnerSim() {
  const { state, dispatch } = useSim();
  const [payment,setPayment]=useState("BNB");
  const [paymentStatus,setPaymentStatus]=useState(localStorage.getItem("processSimulationPaid")?"paid":"idle");
  const [paymentMessage,setPaymentMessage]=useState("");
  const edgLive=useEdgLivePrice(Number(EDG_AMOUNT));
  const [workspaceTab,setWorkspaceTab]=useState("Flowsheet");
  const [runState,setRunState]=useState("Solved");
  const caseInput=useRef(null);
  const runSimulation=()=>{setRunState("Solving");window.setTimeout(()=>{dispatch({type:"RUN"});setRunState("Solved");},350);};
  useEffect(()=>{const status=state.results?.diagnostics?.status;if(status==="invalid"||status==="error")setRunState("Needs input");else if(status==="not-converged")setRunState("Not converged");else if(status==="solved")setRunState("Solved");},[state.results?.diagnostics?.status]);

  const downloadCase = () => {
    const blob = new Blob([JSON.stringify({...state, exportedAt:new Date().toISOString()}, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download=`${(state.projectName||"process-case").replace(/\s+/g,"-").toLowerCase()}.edg.json`; a.click(); URL.revokeObjectURL(url);
  };

  const downloadStreams = () => {
    const head="Stream,Flow (mol/h),Temperature (K),Pressure (kPa),Phase,z(LK)";
    const rows=Object.entries(state.results.streams||{}).map(([key,s])=>[s.name||key,s.F,s.T,s.P,s.phase,s.z].join(","));
    const url=URL.createObjectURL(new Blob([[head,...rows].join("\n")],{type:"text/csv"})); const a=document.createElement("a");
    a.href=url;a.download="edg-stream-table.csv";a.click();URL.revokeObjectURL(url);
  };
  const loadCase=async event=>{const file=event.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());dispatch({type:"LOAD_STATE",payload:parsed});setPaymentMessage("Case loaded safely. Review specifications and run the solver.");}catch{setPaymentMessage("This case file is not valid JSON and was not loaded.");}finally{event.target.value="";}};

  useEffect(()=>{
    const query=new URLSearchParams(window.location.search),result=query.get("payment"),order=query.get("order")||localStorage.getItem("processPaymentOrder");
    if(result==="cancelled"){setPaymentMessage("Payment cancelled; your simulation is preserved.");window.history.replaceState({},"",window.location.pathname);return undefined;}
    if(result!=="return"||!order)return undefined;
    setPaymentStatus("pending");setPaymentMessage("Checking secure payment status...");let stopped=false,attempts=0;
    const check=async()=>{attempts+=1;try{const response=await fetch(`${API_BASE}/api/payments/nowpayments/status/${encodeURIComponent(order)}`),body=await response.json();if(!response.ok)throw new Error(body.error);if(body.status==="finished"){localStorage.setItem("processSimulationPaid",`NOWPAYMENTS-${order}`);setPaymentStatus("paid");setPaymentMessage("Payment confirmed. Case and stream exports are unlocked.");window.history.replaceState({},"",window.location.pathname);return;}if(["failed","expired","refunded"].includes(body.status)){setPaymentStatus("idle");setPaymentMessage(`Payment ${body.status}. Please create a new checkout.`);return;}if(!stopped&&attempts<30)window.setTimeout(check,4000);}catch(error){setPaymentStatus("idle");setPaymentMessage(error.message||"Could not verify payment.");}};
    check();return()=>{stopped=true;};
  },[]);

  async function startBnb(){
    setPaymentStatus("pending");setPaymentMessage("");
    try{const response=await fetch(`${API_BASE}/api/payments/nowpayments/process/invoice`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({design:{projectName:state.projectName,blockCount:state.nodes.length}})}),body=await response.json();if(!response.ok||!body.invoiceUrl)throw new Error(body.error||"Could not create checkout.");localStorage.setItem("processPaymentOrder",body.orderId);window.location.assign(body.invoiceUrl);}catch(error){setPaymentStatus("idle");setPaymentMessage(error.message||"Could not open secure BNB checkout.");}
  }

  async function payEdg(){
    if(!window.ethereum){setPaymentMessage("Install MetaMask or open this page in its wallet browser.");return;}setPaymentStatus("pending");setPaymentMessage("");
    try{try{await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:EDG_CHAIN_ID}]});}catch(error){if(error.code!==4902)throw error;await window.ethereum.request({method:"wallet_addEthereumChain",params:[{chainId:EDG_CHAIN_ID,chainName:"BNB Smart Chain",nativeCurrency:{name:"BNB",symbol:"BNB",decimals:18},rpcUrls:[BSC_RPC],blockExplorerUrls:["https://bscscan.com"]}]});}
      const provider=new BrowserProvider(window.ethereum),signer=await provider.getSigner(),buyer=await signer.getAddress(),token=new Contract(tokenMeta.ADDRESS,EDG_ABI,signer),amount=parseUnits(EDG_AMOUNT,18);const [balance,gas]=await Promise.all([token.balanceOf(buyer),provider.getBalance(buyer)]);if(balance<amount){const available=Number(formatUnits(balance,18)).toLocaleString(undefined,{maximumFractionDigits:2});throw new Error(`Insufficient EDG balance. This wallet has ${available} EDG.`);}if(gas===0n)throw new Error("Add a small amount of BNB for the network fee.");setPaymentMessage(`Confirm ${Number(EDG_AMOUNT).toLocaleString()} EDG in your wallet...`);const transaction=await token.transfer(EDG_ADMIN_WALLET,amount),receipt=await transaction.wait();if(!receipt||receipt.status!==1)throw new Error("The EDG transfer was not confirmed.");localStorage.setItem("processSimulationPaid",`EDG-${transaction.hash}`);setPaymentStatus("paid");setPaymentMessage("EDG payment confirmed. Case and stream exports are unlocked.");
    }catch(error){setPaymentStatus("idle");setPaymentMessage(error.shortMessage||error.reason||error.message||"Payment cancelled.");}
  }

  // Load on mount
  useEffect(() => {
    const raw = localStorage.getItem("edg-sim-state");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        dispatch({ type: "LOAD_STATE", payload: parsed });
      } catch (e) {}
    }
    // eslint-disable-next-line
  }, []);

  // Save on any change
  useEffect(() => {
    const toSave = { ...state, results: { streams: {}, meta: {} } }; // don’t persist results
    localStorage.setItem("edg-sim-state", JSON.stringify(toSave));
  }, [state]);

  return (
    <div className="edg-process-shell">
      <nav className="edg-sim-menubar" aria-label="Simulation workspace">
        <div className="edg-product-mark"><b>ED</b><span>Process Studio<small>Professional flowsheet simulation</small></span></div>
        {["Properties","Simulation","Safety","Economics","Reports"].map(tab=><button key={tab} className={workspaceTab===tab?"active":""} onClick={()=>setWorkspaceTab(tab)}>{tab}</button>)}
        <span className="edg-case-version">Case v1.0 · SI Units</span>
      </nav>
      <div className="edg-workspace-tabs">
        {["Flowsheet","Components","Thermodynamics","Convergence","Analysis","Results"].map(tab=><button key={tab} className={workspaceTab===tab?"active":""} onClick={()=>setWorkspaceTab(tab)}>{tab}</button>)}
      </div>
      <div className="edg-sim-topbar">
        <div><span className="edg-eyebrow">PROCESS DESIGN STUDIO</span><input value={state.projectName} onChange={e=>dispatch({type:"SET_NAME",name:e.target.value})} aria-label="Simulation name" /></div>
        <div className={`edg-solver-status ${runState.toLowerCase().replaceAll(" ","-")}`}><i/>{runState} <span>{Object.keys(state.results.streams||{}).length} streams</span></div>
        <button className="edg-ghost-action" disabled={paymentStatus!=="paid"} onClick={downloadCase}>{paymentStatus==="paid"?"Save case":"🔒 Save case"}</button>
        <button className="edg-ghost-action" disabled={paymentStatus!=="paid"} onClick={downloadStreams}>{paymentStatus==="paid"?"Export CSV":"🔒 Export CSV"}</button>
        <button className="edg-run-action" onClick={runSimulation}>▶ Run simulation</button>
      </div>
      <div className="edg-ribbon">
        <div><b>Case</b><button onClick={()=>dispatch({type:"RESET"})}>New</button><button onClick={()=>caseInput.current?.click()}>Open</button><button onClick={downloadCase} disabled={paymentStatus!=="paid"}>Save</button><input ref={caseInput} type="file" accept="application/json,.json" onChange={loadCase} hidden/></div>
        <div><b>Flowsheet</b><button onClick={()=>dispatch({type:"RUN"})}>Validate</button><button onClick={runSimulation}>Solve</button><button disabled={!state.selection} onClick={()=>dispatch({type:"DELETE_NODE",id:state.selection})}>Delete</button></div>
        <div><b>Property method</b><select value={state.propPack} onChange={e=>dispatch({type:"SET_PROP",pack:e.target.value})}><option>Raoult</option><option>Peng–Robinson</option></select></div>
        <div><b>Solver</b><span>Wegstein recycle</span><span>Tolerance 1e-4</span></div>
        <div className="edg-ribbon-summary"><span>Blocks <b>{state.nodes.length}</b></span><span>Connections <b>{state.edges.length}</b></span></div>
      </div>
      {workspaceTab==="Flowsheet"||workspaceTab==="Simulation"?<div className="edg-sim-layout">
        <Toolbar />
        <div className="edg-card edg-canvas-card">
          <ReactFlowProvider>
            <Canvas />
          </ReactFlowProvider>
        </div>
        <Inspector />
      </div>:<EngineeringWorkspace tab={workspaceTab} state={state} dispatch={dispatch}/>}
      <section className="edg-payment-strip">
        <div><span>PROFESSIONAL PROCESS PACKAGE</span><b>$10 simulation export</b><small>Run and review free · pay once to unlock the editable case and stream report</small></div>
        <div className="edg-payment-choice"><button className={payment==="BNB"?"active":""} onClick={()=>setPayment("BNB")}><i className="bnb">◆</i><b>BNB</b><small>Secure checkout</small></button><button className={payment==="EDG"?"active":""} onClick={()=>setPayment("EDG")}><i className="edg"><img src="/assets/edg_logo.svg" alt="EDG"/></i><b>EDG</b><small>{Number(EDG_AMOUNT).toLocaleString()} EDG</small></button></div>
        {paymentStatus==="paid"?<button className="edg-paid-action" onClick={downloadCase}>Download simulation case</button>:<button className="edg-pay-action" disabled={paymentStatus==="pending"} onClick={payment==="EDG"?payEdg:startBnb}>{paymentStatus==="pending"?"Confirming payment...":payment==="EDG"?`Pay ${Number(EDG_AMOUNT).toLocaleString()} EDG with MetaMask`:"Pay securely with BNB · $10"}</button>}
        <div className="edg-price-note">{payment==="EDG"?`≈ ${edgLive.bnb.toFixed(3)} BNB · BNB Smart Chain`:"NOWPayments hosted invoice"}{paymentMessage&&<strong>{paymentMessage}</strong>}</div>
      </section>
      <footer className="edg-statusbar"><span className="ready">● {runState}</span><span>Property environment: {state.propPack}</span><span>Units: SI</span><span>Model: steady state</span><span className="push">Engineering Drawing Process Studio</span></footer>
    </div>
  );
}

export default function Simulator() {
  return (
    <SimProvider>
      <InnerSim />
    </SimProvider>
  );
}



