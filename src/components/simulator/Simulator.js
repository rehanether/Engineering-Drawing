// …existing imports…
import React, { useEffect, useState } from "react";
import { BrowserProvider, Contract, formatUnits, parseUnits } from "ethers";
import { ReactFlowProvider } from "reactflow";
import { SimProvider, useSim } from "./state/SimContext";
import Canvas from "./ui/Canvas";
import Toolbar from "./ui/Toolbar";
import Inspector from "./ui/Inspector";
import "../process/Process.css";
import "./ProcessPayment.css";
import "./ProcessLayoutFix.css";
import { useEdgLivePrice } from "../payments/useEdgLivePrice";
import tokenMeta from "../../EnggDrawTokenABI.json";

const configuredApiBase=process.env.REACT_APP_API_BASE_URL||"";
const API_BASE=/^https?:\/\//.test(configuredApiBase)&&!configuredApiBase.includes("localhost")?configuredApiBase.replace(/\/$/,""):"";
const EDG_CHAIN_ID="0x38";
const EDG_AMOUNT="500";
const EDG_ADMIN_WALLET="0xD9738cc53E9746a01cAC8EF01aF17fF4e88DD25F";
const EDG_ABI=["function balanceOf(address) view returns (uint256)","function transfer(address,uint256) returns (bool)"];
const BSC_RPC=process.env.REACT_APP_BSC_RPC||"https://bsc-dataseed.bnbchain.org";

function InnerSim() {
  const { state, dispatch } = useSim();
  const [payment,setPayment]=useState("BNB");
  const [paymentStatus,setPaymentStatus]=useState(localStorage.getItem("processSimulationPaid")?"paid":"idle");
  const [paymentMessage,setPaymentMessage]=useState("");
  const edgLive=useEdgLivePrice(Number(EDG_AMOUNT));
  const [workspaceTab,setWorkspaceTab]=useState("Flowsheet");
  const [runState,setRunState]=useState("Solved");
  const runSimulation=()=>{setRunState("Solving");window.setTimeout(()=>{dispatch({type:"RUN"});setRunState("Solved");},350);};

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
        <div className={`edg-solver-status ${runState.toLowerCase()}`}><i/>{runState} <span>{Object.keys(state.results.streams||{}).length} streams</span></div>
        <button className="edg-ghost-action" disabled={paymentStatus!=="paid"} onClick={downloadCase}>{paymentStatus==="paid"?"Save case":"🔒 Save case"}</button>
        <button className="edg-ghost-action" disabled={paymentStatus!=="paid"} onClick={downloadStreams}>{paymentStatus==="paid"?"Export CSV":"🔒 Export CSV"}</button>
        <button className="edg-run-action" onClick={runSimulation}>▶ Run simulation</button>
      </div>
      <div className="edg-ribbon">
        <div><b>Case</b><button onClick={()=>dispatch({type:"RESET"})}>New</button><button onClick={downloadCase} disabled={paymentStatus!=="paid"}>Save</button></div>
        <div><b>Flowsheet</b><button onClick={()=>dispatch({type:"RUN"})}>Validate</button><button onClick={runSimulation}>Solve</button></div>
        <div><b>Property method</b><select value={state.propPack} onChange={e=>dispatch({type:"SET_PROP",pack:e.target.value})}><option>Raoult</option><option>Peng–Robinson</option></select></div>
        <div><b>Solver</b><span>Wegstein recycle</span><span>Tolerance 1e-4</span></div>
        <div className="edg-ribbon-summary"><span>Blocks <b>{state.nodes.length}</b></span><span>Connections <b>{state.edges.length}</b></span></div>
      </div>
      <div className="edg-sim-layout">
        <Toolbar />
        <div className="edg-card edg-canvas-card">
          <ReactFlowProvider>
            <Canvas />
          </ReactFlowProvider>
        </div>
        <Inspector />
      </div>
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



