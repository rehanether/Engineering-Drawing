import React, { useMemo, useState, useEffect, useRef } from "react";
import "./Reactors.css";

/* ---------- helpers ---------- */
const clamp = (x, lo=0, hi=1) => Math.max(lo, Math.min(hi, Number(x)||0));
const h_to_s = 3600;
const m3h_to_m3s = (q)=>(Number(q)||0)/h_to_s;
const R_kJ = 8.314e-3;
const fmt = (x,d)=> (Number.isFinite(x) ? x.toFixed(d) : "-");

/* ---------- sizing ---------- */
function sizeCSTR({ v0_m3s, CA0, X, k, n }){
  const Xc = clamp(X,0,0.999999);
  const CA_out = Math.max(1e-12, CA0*(1-Xc));
  const rate = Math.max(1e-12,k)*Math.pow(CA_out,n);
  const V = v0_m3s*(Xc*CA0)/rate;
  const tau = V/Math.max(v0_m3s,1e-12);
  return { V, tau, CA_out };
}
function sizePFR({ v0_m3s, CA0, X, k, n }){
  const Xc = clamp(X,0,0.999999);
  const A = Math.max(1e-12,k)*Math.pow(Math.max(1e-12,CA0),n);
  const I = (Math.abs(n-1)<1e-12) ? Math.log(1/(1-Xc)) : (Math.pow(1-Xc,1-n)-1)/(1-n);
  const V = (v0_m3s/A)*I;
  const tau = V/Math.max(v0_m3s,1e-12);
  const CA_out = CA0*(1-Xc);
  return { V, tau, CA_out };
}
function timeBatch({ CA0, X, k, n }){
  const Xc = clamp(X,0,0.999999);
  if (Math.abs(n-1)<1e-12) return { t:(1/Math.max(k,1e-12))*Math.log(1/(1-Xc)) };
  return { t:(1/(Math.max(k,1e-12)*(n-1)*Math.pow(Math.max(1e-12,CA0),n-1)))*(1/Math.pow(1-Xc,n-1)-1) };
}
function dimCSTR(V,HtoD=1.2){ const D=Math.pow(Math.max((4*V)/(Math.PI*HtoD),1e-12),1/3); return { D, H:HtoD*D }; }
function dimPFR(V,D=0.1){ const A=Math.PI*D*D/4; const L=Math.max(V,0)/Math.max(A,1e-12); return { D, L, A }; }

/* LMTD */
function lmtd(dT1,dT2){
  const a=Math.max(1e-9,Math.abs(dT1)), b=Math.max(1e-9,Math.abs(dT2));
  if (Math.abs(a-b)<1e-9) return (a+b)/2;
  return (a-b)/Math.log(a/b);
}

/* piping / motors */
const PIPE_SIZES=[{nps:'½"',id:0.015},{nps:'1"',id:0.026},{nps:'1½"',id:0.040},{nps:'2"',id:0.052},{nps:'3"',id:0.077},{nps:'4"',id:0.102}];
function pickLineSize(Q,vmax=2.0){ for(const p of PIPE_SIZES){ const v=Q/(Math.PI*p.id*p.id/4); if(v<=vmax) return {...p,v}; } const last=PIPE_SIZES[PIPE_SIZES.length-1]; return {...last,v:Q/(Math.PI*last.id*last.id/4)}; }
const STD_MOTORS=[0.37,0.55,0.75,1.1,1.5,2.2,3,4,5.5,7.5,11,15,18.5,22,30,37,45,55];

/* materials */
const MOC_DB={
  CS:{S_MPa:138,E_GPa:200,alpha_K:12e-6,nu:0.30,note:"Carbon Steel"},
  SS304L:{S_MPa:115,E_GPa:193,alpha_K:17e-6,nu:0.29,note:"Stainless 304L"},
  SS316L:{S_MPa:129,E_GPa:193,alpha_K:16e-6,nu:0.30,note:"Stainless 316L"},
  Duplex2205:{S_MPa:240,E_GPa:200,alpha_K:13e-6,nu:0.30,note:"Duplex 2205"},
  HastC276:{S_MPa:155,E_GPa:205,alpha_K:12.5e-6,nu:0.30,note:"Hastelloy C-276"}
};
const THK=[3,4,5,6,8,10,12,14,16,18,20,22,25,28,32,36,40];

/* misc */
const STEEL_RHO=7850;
const PIPE_OD={ '2"':0.0603, '3"':0.0889 };
const roundUp=(mm)=>THK.find(t=>t>=mm)||Math.ceil(mm/5)*5;
function pickHeader(q_m3s,fluid){
  const vmax = fluid==="steam" ? 25 : 2.0;
  const sizes=[{nps:'¾"',id:0.020},{nps:'1"',id:0.026},{nps:'1¼"',id:0.035},{nps:'1½"',id:0.040},{nps:'2"',id:0.052},{nps:'2½"',id:0.062},{nps:'3"',id:0.077},{nps:'4"',id:0.102},{nps:'6"',id:0.154}];
  for(const s of sizes){ const v=q_m3s/(Math.PI*s.id*s.id/4); if(v<=vmax) return {...s,v}; }
  const last=sizes[sizes.length-1]; return {...last,v:q_m3s/(Math.PI*last.id*last.id/4)};
}

/* ---------- defaults for Reset ---------- */
const DEF = {
  type: "CSTR",
  inp: { v0_m3h:1, CA0:1000, X:0.7, n:1, k:0.002, D_tube:0.1, HtoD:1.2, V_batch:1 },
  arr: { k_ref:0.002, T_ref_C:60, Ea_kJmol:55 },
  eng: { mode:"isothermal", T_feed_C:60, T_reactor_C:60, rho:1000, Cp_kJkgK:4.0, dH_kJmol:-80 },
  uti: { type:"CW", U_Wm2K:450, Tin_C:30, Tout_C:40 },
  mix: { mu_Pa_s:0.001, impeller:"PBT45", N_rpm:120, Di_over_D:0.33, SF:1.2, baffles:true },
  pfr: { roughness_m:0.000045, n_tubes:1 },
  mech:{ MOC:"SS316L", S_MPa:MOC_DB.SS316L.S_MPa, E_weld:0.85, CA_mm:1.5, P_design_bar:3, T_design_C:80, headType:"E2:1", dT_jacket_K:0 },
  support:{ mode:"Auto", orientation:"Vertical" },
  jacket:{ type:"HalfPipe", hp_nps:'2"' },
  noz:{ nps:'2"', opening_mm:60 }
};

/* ---------- Step nav ---------- */
const StepNav=()=>(
  <div className="rx-step-nav">
    <a href="#step-1">Step-1</a><a href="#step-2">Step-2</a><a href="#step-3">Step-3</a>
    <a href="#step-4">Step-4</a><a href="#step-5">Step-5</a><a href="#pandid">HMBD/P&ID</a>
  </div>
);

/* ================================================================== */
/*                              Component                              */
/* ================================================================== */
export default function Reactors(){
  const [type,setType]=useState(DEF.type);
  const [inp,setInp]=useState({...DEF.inp});
  const [kinMode,setKinMode]=useState("direct");
  const [arr,setArr]=useState({...DEF.arr});
  const [eng,setEng]=useState({...DEF.eng});
  const [uti,setUti]=useState({...DEF.uti});
  const [mix,setMix]=useState({...DEF.mix});
  const [pfr,setPfr]=useState({...DEF.pfr});
  const [mech,setMech]=useState({...DEF.mech});
  const [support,setSupport]=useState({...DEF.support});
  const [jacket,setJacket]=useState({...DEF.jacket});
  const [noz,setNoz]=useState({...DEF.noz});

  useEffect(()=>{
    if(uti.type==="CW")     setUti(s=>({...s,U_Wm2K:450,Tin_C:30,Tout_C:40}));
    if(uti.type==="CHW")    setUti(s=>({...s,U_Wm2K:500,Tin_C:7, Tout_C:12}));
    if(uti.type==="Steam3") setUti(s=>({...s,U_Wm2K:1200,Tin_C:133,Tout_C:133}));
    if(uti.type==="Steam5") setUti(s=>({...s,U_Wm2K:1300,Tin_C:158,Tout_C:158}));
  },[uti.type]);
  useEffect(()=>{ setMech(s=>({...s,S_MPa:MOC_DB[s.MOC].S_MPa})); },[mech.MOC]);

  const handle     = e=>setInp(s=>({...s,[e.target.name]:Number(e.target.value)}));
  const handleArr  = e=>setArr(s=>({...s,[e.target.name]:Number(e.target.value)}));
  const handleEng  = e=>setEng(s=>({...s,[e.target.name]:Number(e.target.value)}));
  const handleUti  = e=>setUti(s=>({...s,[e.target.name]: e.target.name==="type" ? e.target.value : Number(e.target.value)}));
  const handleMix  = e=>{ const {name,type:t,checked,value}=e.target; setMix(s=>({...s,[name]:(t==="checkbox"?checked:(name==="impeller"?value:Number(value)))})); };
  const handlePfr  = e=>setPfr(s=>({...s,[e.target.name]:Number(e.target.value)}));
  const handleMech = e=>setMech(s=>({...s,[e.target.name]:(e.target.name==="MOC"||e.target.name==="headType")?e.target.value:Number(e.target.value)}));
  const resetAll   = ()=>{
    setType(DEF.type); setInp({...DEF.inp}); setKinMode("direct"); setArr({...DEF.arr});
    setEng({...DEF.eng}); setUti({...DEF.uti}); setMix({...DEF.mix}); setPfr({...DEF.pfr});
    setMech({...DEF.mech}); setSupport({...DEF.support}); setJacket({...DEF.jacket}); setNoz({...DEF.noz});
    // scroll to top for clarity
    window.location.hash = "";
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  /* k(T) */
  const k_eff=useMemo(()=>{
    if(kinMode==="direct") return inp.k;
    const T=(eng.T_reactor_C??25)+273.15, Tref=(arr.T_ref_C??25)+273.15;
    return arr.k_ref*Math.exp(-arr.Ea_kJmol/R_kJ*(1/T-1/Tref));
  },[kinMode,inp.k,arr.k_ref,arr.Ea_kJmol,arr.T_ref_C,eng.T_reactor_C]);

  /* Step-1 */
  const step1=useMemo(()=>{
    const v0 = Math.max(1e-12,m3h_to_m3s(inp.v0_m3h));
    const base={ v0_m3s:v0, CA0:Math.max(0,inp.CA0||0), X:inp.X, k:Math.max(1e-12,k_eff||0), n:inp.n };
    if(type==="CSTR"){ const out=sizeCSTR(base); const geo=dimCSTR(out.V,inp.HtoD); return {...out,geo}; }
    if(type==="PFR"){ const out=sizePFR(base); const geo=dimPFR(out.V/Math.max(1,pfr.n_tubes),inp.D_tube); return {...out,geo}; }
    const out=timeBatch({CA0:base.CA0,X:base.X,k:base.k,n:base.n});
    const geo=dimCSTR(inp.V_batch,inp.HtoD); return {...out,geo,V:inp.V_batch};
  },[inp,type,k_eff,pfr.n_tubes]);

  /* Step-2 */
  const step2=useMemo(()=>{
    const X=clamp(inp.X,0,0.999999), v0=m3h_to_m3s(inp.v0_m3h);
    const F_A0=(type==="Batch")?0:v0*inp.CA0;
    const mdot=(type==="Batch")?0:eng.rho*v0;
    const Qrxn_kW_cont=F_A0*X*(-eng.dH_kJmol);
    let res={ note:"", Q_kW:0, T_out_adiabatic_C:null, LMTD_K:null, Area_m2:null, utilFlow:null, k_eff };

    if(eng.mode==="adiabatic"){
      if(type==="Batch"){
        const dT=(inp.CA0*X*(-eng.dH_kJmol))/Math.max(eng.rho*eng.Cp_kJkgK,1e-6);
        res.T_out_adiabatic_C=eng.T_feed_C+dT; res.note="Batch adiabatic ΔT."; return res;
      }
      const dT=Qrxn_kW_cont/Math.max(mdot*eng.Cp_kJkgK,1e-6);
      res.T_out_adiabatic_C=eng.T_feed_C+dT; res.note="Continuous adiabatic ΔT."; return res;
    }

    res.Q_kW=(type==="Batch")?(inp.CA0*X*(-eng.dH_kJmol)):Qrxn_kW_cont;
    const Qabs_W=Math.abs(res.Q_kW)*1000;

    if(uti.type==="Steam3"||uti.type==="Steam5"){
      const Tsteam=uti.Tin_C;
      const dT=(res.Q_kW>=0)?(Tsteam-eng.T_reactor_C):(eng.T_reactor_C-Tsteam);
      const LMTD_K=Math.max(1e-6,Math.abs(dT));
      const Area_m2=Qabs_W/(uti.U_Wm2K*LMTD_K);
      const lambda=(uti.type==="Steam3")?2130:2100;
      const m_kg_s=Math.abs(res.Q_kW)/lambda;
      return {...res,LMTD_K,Area_m2,utilFlow:{type:"steam",steam_kg_h:m_kg_s*3600},note:"Isothermal via steam"};
    }else{
      const Tin=uti.Tin_C, Tout=uti.Tout_C;
      const LMTD_K=lmtd(Math.abs(eng.T_reactor_C-Tout),Math.abs(eng.T_reactor_C-Tin));
      const Area_m2=Qabs_W/(uti.U_Wm2K*Math.max(1e-6,LMTD_K));
      const Cp_w=4.18, rho_w=1000;
      const m_kg_s=Math.abs(res.Q_kW)/Math.max(Cp_w*(Tout-Tin),0.1);
      const q_m3_h=(m_kg_s/rho_w)*3600;
      return {...res,LMTD_K,Area_m2,utilFlow:{type:"water",m_kg_s,q_m3_h},note:"Isothermal via water"};
    }
  },[inp,type,eng,uti,k_eff]);

  /* Step-3 (mixing or ΔP) */
  const mixing=useMemo(()=>{
    if(!(type==="CSTR"||type==="Batch")) return null;
    const rho=eng.rho, mu=Math.max(1e-5,mix.mu_Pa_s);
    const D=step1?.geo?.D||1, Di=mix.Di_over_D*D, N=(mix.N_rpm||1)/60;
    const Re=rho*N*Di*Di/mu;
    const Po_t=(mix.impeller==="Rushton")?5.0:(mix.impeller==="Hydrofoil")?0.35:1.3;
    const K_l=(mix.impeller==="Rushton")?16.0:(mix.impeller==="Hydrofoil")?3.2:5.0;
    let Po; if(Re<10) Po=K_l/Math.max(1,Re); else if(Re>1e4) Po=Po_t; else { const f=(Math.log10(Re)-1)/3; Po=(1-f)*(K_l/Re)+f*Po_t; }
    Po = mix.baffles ? Po : Po*0.8;
    const P_W=Po*rho*N**3*Di**5, P_kW=P_W/1000, P_motor_kW=P_kW*mix.SF;
    const motor=STD_MOTORS.find(m=>m>=P_motor_kW)||P_motor_kW;
    const T_Nm=P_W/(2*Math.PI*N), tip=Math.PI*Di*N, tau_allow=25e6;
    const d_shaft_m=Math.cbrt((16*T_Nm)/(Math.PI*tau_allow));
    return { Re, Po, P_kW, P_motor_kW, motor, T_Nm, tip, Di, D_tank:D, d_shaft_m, baffle_w:0.1*D, clearance:0.2*D };
  },[type,step1?.geo?.D,eng.rho,mix]);

  const pfrDP=useMemo(()=>{
    if(type!=="PFR") return null;
    const rho=eng.rho, mu=Math.max(1e-5,mix.mu_Pa_s), D=inp.D_tube, A=Math.PI*D*D/4;
    const v0=m3h_to_m3s(inp.v0_m3h)/Math.max(1,pfr.n_tubes), vel=v0/Math.max(A,1e-12);
    const Re=rho*vel*D/mu;
    let f; if(Re<2100) f=64/Math.max(1,Re); else{ const e=pfr.roughness_m; const term=(e/(3.7*D))+(5.74/Math.pow(Math.max(1,Re),0.9)); f=0.25/Math.pow(Math.log10(term),2); }
    const L=step1?.geo?.L||1, dP=f*(L/D)*0.5*rho*vel*vel;
    return { vel, Re, f, L, dP_bar:dP/1e5, dP_kPa:dP/1000 };
  },[type,eng.rho,mix.mu_Pa_s,inp.D_tube,inp.v0_m3h,pfr.n_tubes,pfr.roughness_m,step1?.geo?.L]);

  /* Step-4 */
  const step4=useMemo(()=>{
    const D=step1?.geo?.D||1, R_mm=D*500, D_mm=D*1000;
    const E=mech.E_weld, P=mech.P_design_bar*0.1, S=mech.S_MPa, CA=mech.CA_mm;
    const t_shell=(P*R_mm)/(S*E-0.6*P)+CA, t_head=(P*D_mm)/(2*S*E-0.2*P)+CA;
    const t_shell_sel=roundUp(t_shell), t_head_sel=roundUp(t_head);
    const mat=MOC_DB[mech.MOC]||MOC_DB.SS316L;
    const sigma_th=(mat.E_GPa*1000*mat.alpha_K*mech.dT_jacket_K*0.3)/(1-mat.nu);
    const risk = sigma_th>0.67*S?"High":(sigma_th>0.33*S?"Moderate":"Low");
    return { D_m:D, P_MPa:P, S, E, CA, t_shell, t_head, t_shell_sel, t_head_sel, sigma_th, risk, matNote:mat.note };
  },[step1?.geo?.D,mech]);

  /* Step-5 */
  const supports=useMemo(()=>{
    const D=step1?.geo?.D||1, H=step1?.geo?.H||1.2;
    const ts=(step4?.t_shell_sel||6)/1000, th=(step4?.t_head_sel||6)/1000;
    const cylA=Math.PI*D*H, headA=1.11*Math.PI*(D/2)**2;
    const vesselMass=(cylA*ts+2*headA*th)*STEEL_RHO*1.08;
    const contentMass=(step1?.V||0)*(eng.rho||1000);
    const W_kN=(vesselMass+contentMass)*9.81/1000;
    let mode=support.mode; if(mode==="Auto") mode=(D<1.5&&W_kN<60)?"Legs":"Skirt";
    const S_allow=120e6; let legs=null, skirt=null;
    if(mode==="Legs"){ const n=W_kN>40?6:4; const A_req=(W_kN*1e6)/(S_allow*n); legs={n,A_leg_req_mm2:A_req,perLeg_kN:W_kN/n}; }
    else{ const t_req=(W_kN*1000)/(Math.PI*D*S_allow); const t_mm=Math.max(0.006,t_req)*1000; skirt={t_req_mm:t_mm,t_sel_mm:roundUp(t_mm)}; }
    return { W_kN, vesselMass, contentMass, mode, legs, skirt };
  },[step1,step4,eng.rho,support.mode]);

  const jacketCalc=useMemo(()=>{
    if(eng.mode!=="isothermal") return { note:"Adiabatic (no utility)" };
    const A_req=step2?.Area_m2||0;
    if(jacket.type==="HalfPipe"){
      const D=step1?.geo?.D||1, H=step1?.geo?.H||1.2, Dhp=PIPE_OD[jacket.hp_nps]||0.0603;
      const Apm=0.5*Math.PI*Dhp, L=A_req/Math.max(1e-6,Apm), turns=L/(Math.PI*D), pitch=H/Math.max(1e-6,turns);
      return { type:"Half-pipe", hp_nps:jacket.hp_nps, L_req:L, pitch_m:pitch, turns };
    }
    if(jacket.type==="Dimple"){
      const area_shell=Math.PI*(step1?.geo?.D||1)*(step1?.geo?.H||1.2);
      const cov=Math.min(100,(A_req/Math.max(1e-6,area_shell))*100);
      return { type:"Dimple", coverage_pct:cov };
    }
    return { type:"Conventional", note:"A=U·A·LMTD; sized by Step-2 area" };
  },[jacket,step2?.Area_m2,step1,eng.mode]);

  const headers=useMemo(()=>{
    if(eng.mode!=="isothermal") return null;
    if(step2.utilFlow?.type==="water"){ const q=(step2.utilFlow.m_kg_s||0)/1000; return { fluid:"water", header: pickHeader(q,"water") }; }
    if(step2.utilFlow?.type==="steam"){
      const mdot=(step2.utilFlow.steam_kg_h||0)/3600, rho=3;
      const sizes=['¾"','1"','1¼"','1½"','2"','2½"','3"','4"','6"']
        .map(s=>({nps:s,id:{'¾"':0.020,'1"':0.026,'1¼"':0.035,'1½"':0.040,'2"':0.052,'2½"':0.062,'3"':0.077,'4"':0.102,'6"':0.154}[s]}));
      for(const s of sizes){ const v=mdot/(rho*(Math.PI*s.id*s.id/4)); if(v<=25) return {fluid:"steam",header:{...s,v}}; }
      const last=sizes[sizes.length-1]; const v=mdot/(rho*(Math.PI*last.id*last.id/4)); return {fluid:"steam",header:{...last,v}};
    }
    return null;
  },[step2,eng.mode]);

  const repad=useMemo(()=>{
    const ts=step4?.t_shell_sel||6, doMM=noz.opening_mm, w=Math.max(2*ts,50), tp=Math.max(ts,6), od=doMM+2*w;
    return { ts, doMM, w, tp, od };
  },[step4?.t_shell_sel,noz.opening_mm]);

  /* HMBD */
  const svgRef=useRef(null);
  const v0_m3s=m3h_to_m3s(inp.v0_m3h);
  const mainLine=pickLineSize(v0_m3s);
  const utilStr = eng.mode==="isothermal" ? (uti.type.startsWith("Steam") ? `Steam ≈ ${fmt(step2?.utilFlow?.steam_kg_h,0)} kg/h` : `CW ≈ ${fmt(step2?.utilFlow?.q_m3_h,2)} m³/h`) : "Adiabatic";

  /* Actions */
  const downloadSVG=()=>{
    if(!svgRef.current) return;
    const svg=svgRef.current.outerHTML;
    const blob=new Blob([svg],{type:"image/svg+xml;charset=utf-8"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="Reactor_HMBD.svg"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  function buildBoMRows(){
    const rows=[];
    const vesselD = fmt(step1?.geo?.D,2);
    const vesselH = fmt(step1?.geo?.H,2);
    const tShell = step4.t_shell_sel;
    const tHead  = step4.t_head_sel;

    // quick mass buckets (kg)—for CSV info
    const m_shell_heads = (supports?.vesselMass||0);
    const m_supports = supports.mode==="Legs" ? (supports.legs?.n||4)*20 : (supports.skirt ? (supports.skirt.t_sel_mm/1000)*(step1?.geo?.D||1)*250 : 0);
    const m_jacket = jacket.type==="HalfPipe" ? (jacketCalc.L_req||0)* (headers?.fluid==="steam" ? 2.5 : 2.0) : 0;

    rows.push(["1","Shell + Head", `D≈${vesselD} m, H≈${vesselH} m; Shell t=${tShell} mm; Head t=${tHead} mm`, mech.MOC, 1, "set", Math.round(m_shell_heads), "Cylindrical shell with two 2:1 heads"]);
    if(type!=="PFR"){
      rows.push(["2","Agitator Drive", `${fmt(mixing?.motor,2)} kW motor with gearbox`, "-", 1, "set", "", "Including coupling & baseplate"]);
    } else {
      rows.push(["2","Reactor (PFR)", `Tube D=${inp.D_tube} m; N=${pfr.n_tubes}`, mech.MOC, 1, "lot", "", "Per tube length ≈ "+fmt(step1?.geo?.L,2)+" m"]);
    }
    rows.push(["3","Utility System", eng.mode==="isothermal" ? (headers?.fluid==="water" ? "Cooling Water header" : "Steam header") : "Adiabatic", "-", 1, "lot", "", eng.mode==="isothermal" ? `Header ${headers?.header?.nps}` : ""]);
    rows.push(["4","Supports", supports.mode==="Legs" ? `${supports.legs.n} legs` : `Skirt t=${supports.skirt?.t_sel_mm} mm`, mech.MOC, 1, "set", Math.round(m_supports), "Foundations by civil"]);
    if(jacket.type==="HalfPipe" || jacket.type==="Dimple" || jacket.type==="Conventional"){
      rows.push(["5","Jacket", jacket.type==="HalfPipe" ? `Half-pipe ${jacket.hp_nps}, L≈${fmt(jacketCalc.L_req,1)} m` : jacket.type, mech.MOC, 1, "set", Math.round(m_jacket), ""]);
    }
    rows.push(["6","Nozzles & Flanges", "Per nozzle list; pads as req.", mech.MOC, "", "", "", ""]);
    rows.push(["7","Instrumentation", "LIT, TT/TIC, PT/PIC, FIT/FCV", "-", 1, "lot", "", ""]);
    rows.push(["8","Painting/Passivation", mech.MOC==="CS" ? "Blast + epoxy system" : "Pickle & passivate", "-", 1, "lot", "", ""]);
    rows.push(["9","Nameplate & Documents", "Datasheets, GA, P&ID, test certs", "-", 1, "lot", "", ""]);

    return rows;
  }

  const downloadBOMCsv=()=>{
    const rows = buildBoMRows();
    const head = ["Item","Tag/Category","Description","MOC","Qty","Unit","Est. Weight (kg)","Notes"];
    const csv=[head, ...rows].map(r=>r.map(x=>`"${String(x??"")}"`).join(",")).join("\n");
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="EDG_Reactor_BoM.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const printBoM = ()=>{
    const rows = buildBoMRows();
    const now = new Date().toLocaleString();
    const win=window.open("","_blank","width=900,height=700"); if(!win) return;
    const meta = `
      <table style="width:100%;border-collapse:collapse;margin:6px 0 10px;font-size:12px">
        <tr><td><b>Project</b></td><td>Engineering Drawing (EDG) — Reactor</td><td><b>Date</b></td><td>${now}</td></tr>
        <tr><td><b>Service</b></td><td>${type} Reactor</td><td><b>MOC</b></td><td>${mech.MOC}</td></tr>
        <tr><td><b>Design</b></td><td>P=${mech.P_design_bar} barg; T=${mech.T_design_C} °C</td><td><b>Volume</b></td><td>${fmt(step1?.V,3)} m³</td></tr>
      </table>`;
    const tableRows = rows.map(r=>`
      <tr>
        <td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td>
        <td style="text-align:right">${r[4]}</td><td>${r[5]}</td>
        <td style="text-align:right">${r[6]??""}</td><td>${r[7]??""}</td>
      </tr>`).join("");

    win.document.write(`
      <html><head><title>EDG — Bill of Materials</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;color:#0f172a}
        h1{margin:0 0 4px;font-size:22px}
        h2{margin:12px 0 6px;font-size:16px}
        .brand{font-weight:800;font-size:13px;color:#1e293b}
        .muted{color:#64748b}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #e5e7eb;padding:8px;vertical-align:top}
        th{background:#f8fafc;text-align:left}
        .wm{position:fixed;left:50%;top:45%;transform:translate(-50%,-50%) rotate(-25deg);font-weight:800;font-size:80px;color:#0f172a;opacity:.06;pointer-events:none}
        @media print{ .actions{display:none} }
      </style></head><body>
      <div class="wm">engineeringdrawing.io</div>
      <h1>Bill of Materials (Reactor)</h1>
      <div class="brand">Engineering Drawing (EDG) — Industry 4.0 • AI • On-Chain Transparency</div>
      <div class="muted">contact@engineeringdrawing.io • admin@engineeringdrawing.io • engineeringdrawing.io</div>
      ${meta}
      <table><thead>
        <tr><th>#</th><th>Tag / Category</th><th>Description</th><th>MOC</th><th>Qty</th><th>Unit</th><th>Est. Weight (kg)</th><th>Notes</th></tr>
      </thead><tbody>${tableRows}</tbody></table>
      <p class="muted" style="margin-top:8px">Weights are indicative. Final items & quantities per approved drawings and vendor GA.</p>
      </body></html>
    `);
    win.document.close(); win.focus(); win.print();
  };

  const printPDF=()=>{
    const win=window.open("","_blank","width=900,height=700"); if(!win) return;
    const svg=svgRef.current?svgRef.current.outerHTML:"";
    win.document.write(`
      <html><head><title>Reactor Basic Engineering Package</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;padding:24px;color:#0f172a}
        h1,h2{margin:0 0 8px}
        .card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin:12px 0}
        ul{margin:8px 0 0 18px}
        small{color:#6b7280}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
        .wm{position:fixed;left:50%;top:45%;transform:translate(-50%,-50%) rotate(-25deg);font-weight:800;font-size:100px;color:#0f172a;opacity:.06;pointer-events:none}
      </style></head><body>
      <div class="wm">engineeringdrawing.io</div>
      <h1>Reactor Basic Engineering Package</h1>
      <div class="card" style="border-color:#e5e7eb">
        <div style="font-weight:800">Engineering Drawing (EDG) — Industry 4.0 • AI • On-Chain</div>
        <div style="color:#64748b">contact@engineeringdrawing.io • admin@engineeringdrawing.io • engineeringdrawing.io</div>
      </div>
      <div class="card grid">
        <div>
          <h2>Process Sizing</h2>
          <ul>
            <li>Type: ${type}</li>
            <li>V ≈ ${fmt(type==="Batch"?step1?.V:step1?.V,3)} m³; τ ≈ ${type!=="Batch"?fmt(step1?.tau,1):"-"} s</li>
            <li>C_A,out ≈ ${type!=="Batch"?fmt(step1?.CA_out,1):"-"} mol/m³; X = ${inp.X}</li>
          </ul>
          <h2>Energy</h2>
          <ul>
            ${ eng.mode==="adiabatic"
                ? `<li>Adiabatic T_out ≈ ${fmt(step2.T_out_adiabatic_C,1)} °C</li>`
                : `<li>Q ≈ ${fmt(step2.Q_kW,1)} kW; A ≈ ${fmt(step2.Area_m2,2)} m²; ${utilStr}</li>` }
          </ul>
        </div>
        <div>
          <h2>Mechanical</h2>
          <ul>
            <li>MOC: ${mech.MOC} (${step4.matNote})</li>
            <li>Shell t_req ≈ ${fmt(step4.t_shell,1)} mm → <b>${step4.t_shell_sel} mm</b></li>
            <li>Head t_req ≈ ${fmt(step4.t_head,1)} mm → <b>${step4.t_head_sel} mm</b></li>
            <li>σ_th ≈ ${fmt(step4.sigma_th,1)} MPa (<b>${step4.risk}</b> vs S=${step4.S} MPa)</li>
          </ul>
          <small>Thin-wall ASME pre-check; verify per code with wind/seismic, supports, nozzle loads, and fabrication tolerances.</small>
        </div>
      </div>
      <div class="card">
        <h2>HMBD / P&ID Snapshot</h2>
        ${svg}
        <small>Auto-generated. Instrument tags: FIT on feed, TT/TIC, PT/PIC, LIT; PSV on top head.</small>
      </div>
      </body></html>
    `);
    win.document.close(); win.focus(); win.print();
  };

  /* ---------- UI ---------- */
  return (
    <div className="reactors-content">
      <h1>Reactor Design (Steps 1–5)</h1>
      <StepNav />

      {/* Top card: tools */}
      <div className="card">
        <div className="toolbar">
          <button className="secondary-button" onClick={resetAll}>Reset</button>
        </div>
        <div className="four-col">
          {/* Basis & Specs */}
          <div className="pane">
            <h3>Basis &amp; Specs</h3>
            <div className="form-subgrid">
              <label>Reactor Type
                <select value={type} onChange={(e)=>setType(e.target.value)}>
                  <option>CSTR</option><option>PFR</option><option>Batch</option>
                </select>
              </label>
              <label>v₀ (m³/h)
                <input type="number" step="0.0001" name="v0_m3h" value={inp.v0_m3h} onChange={handle} disabled={type==="Batch"}/>
              </label>
              <label>C<sub>A0</sub> (mol/m³)
                <input type="number" step="0.1" name="CA0" value={inp.CA0} onChange={handle}/>
              </label>
              <label>X (0–1)
                <input type="number" min="0" max="0.999" step="0.001" name="X" value={inp.X} onChange={handle}/>
              </label>
              <label>Order n
                <input type="number" step="0.1" name="n" value={inp.n} onChange={handle}/>
              </label>
              {type!=="PFR" && (
                <label>H/D
                  <input type="number" step="0.1" name="HtoD" value={inp.HtoD} onChange={handle}/>
                </label>
              )}
              {type==="PFR" && (
                <>
                  <label>Tube D (m)
                    <input type="number" step="0.001" name="D_tube" value={inp.D_tube} onChange={handle}/>
                  </label>
                  <label>Parallel tubes
                    <input type="number" step="1" name="n_tubes" value={pfr.n_tubes} onChange={handlePfr}/>
                  </label>
                </>
              )}
              {type==="Batch" && (
                <label>Batch V (m³)
                  <input type="number" step="0.001" name="V_batch" value={inp.V_batch} onChange={handle}/>
                </label>
              )}
            </div>
          </div>

          {/* Kinetics */}
          <div className="pane">
            <h3>Kinetics</h3>
            <div className="form-subgrid">
              <label>Mode
                <select value={kinMode} onChange={(e)=>setKinMode(e.target.value)}>
                  <option value="direct">Direct k</option>
                  <option value="arr">Arrhenius k(T)</option>
                </select>
              </label>
              {kinMode==="direct" ? (
                <label>k [(m³/mol)<sup>n-1</sup>/s]
                  <input type="number" step="0.000001" name="k" value={inp.k} onChange={handle}/>
                </label>
              ):(
                <>
                  <label>k<sub>ref</sub> [(m³/mol)<sup>n-1</sup>/s]
                    <input type="number" step="0.000001" name="k_ref" value={arr.k_ref} onChange={handleArr}/>
                  </label>
                  <label>T<sub>ref</sub> (°C)
                    <input type="number" step="0.1" name="T_ref_C" value={arr.T_ref_C} onChange={handleArr}/>
                  </label>
                  <label>E<sub>a</sub> (kJ/mol)
                    <input type="number" step="0.1" name="Ea_kJmol" value={arr.Ea_kJmol} onChange={handleArr}/>
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Energy */}
          <div className="pane">
            <h3>Energy</h3>
            <div className="form-subgrid">
              <label>Mode
                <select name="mode" value={eng.mode} onChange={(e)=>setEng(s=>({...s,mode:e.target.value}))}>
                  <option value="isothermal">Isothermal (compute Q)</option>
                  <option value="adiabatic">Adiabatic (compute T<sub>out</sub>)</option>
                </select>
              </label>
              <label>T<sub>feed</sub> (°C)
                <input type="number" step="0.1" name="T_feed_C" value={eng.T_feed_C} onChange={handleEng}/>
              </label>
              <label>T<sub>reactor</sub> (°C)
                <input type="number" step="0.1" name="T_reactor_C" value={eng.T_reactor_C} onChange={handleEng} disabled={eng.mode!=="isothermal"}/>
              </label>
              <label>ρ (kg/m³)
                <input type="number" step="0.1" name="rho" value={eng.rho} onChange={handleEng}/>
              </label>
              <label>C<sup>p</sup> (kJ/kg·K)
                <input type="number" step="0.01" name="Cp_kJkgK" value={eng.Cp_kJkgK} onChange={handleEng}/>
              </label>
              <label>ΔH<sub>r</sub> (kJ/mol A)
                <input type="number" step="0.1" name="dH_kJmol" value={eng.dH_kJmol} onChange={handleEng}/>
              </label>
              <div className="small" style={{gridColumn:"1 / -1"}}>Adiabatic mode disables utility in HX.</div>
            </div>
          </div>

          {/* Utility & HX */}
          <div className="pane">
            <h3>Utility &amp; HX</h3>
            <div className="form-subgrid">
              <label>Utility
                <select name="type" value={uti.type} onChange={handleUti} disabled={eng.mode!=="isothermal"}>
                  <option value="CW">Cooling Water</option>
                  <option value="CHW">Chilled Water</option>
                  <option value="Steam3">Steam 3 barg</option>
                  <option value="Steam5">Steam 5 barg</option>
                </select>
              </label>
              <label>U (W/m²·K)
                <input type="number" step="1" name="U_Wm2K" value={uti.U_Wm2K} onChange={handleUti} disabled={eng.mode!=="isothermal"}/>
              </label>
              <label>T<sub>in</sub> (°C)
                <input type="number" step="0.1" name="Tin_C" value={uti.Tin_C} onChange={handleUti} disabled={eng.mode!=="isothermal"}/>
              </label>
              <label>T<sub>out</sub> (°C)
                <input type="number" step="0.1" name="Tout_C" value={uti.Tout_C} onChange={handleUti} disabled={eng.mode!=="isothermal" || uti.type.startsWith("Steam")}/>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Step-5 controls */}
      <div className="card" id="step-5">
        <h2><span className="step-badge">Step-5</span> Supports &amp; Jacket</h2>
        <div className="form-subgrid" style={{gridTemplateColumns:"160px 1fr"}}>
          <label>Support Mode
            <select value={support.mode} onChange={(e)=>setSupport(s=>({...s,mode:e.target.value}))}>
              <option>Auto</option><option>Legs</option><option>Skirt</option>
            </select>
          </label>
          <label>Orientation
            <select value={support.orientation} onChange={(e)=>setSupport(s=>({...s,orientation:e.target.value}))}>
              <option>Vertical</option><option disabled>Horizontal</option>
            </select>
          </label>
          <label>Jacket Type
            <select value={jacket.type} onChange={(e)=>setJacket(s=>({...s,type:e.target.value}))}>
              <option value="Conventional">Conventional</option>
              <option value="HalfPipe">Half-pipe</option>
              <option value="Dimple">Dimple</option>
            </select>
          </label>
          {jacket.type==="HalfPipe" && (
            <label>Half-pipe Size
              <select value={jacket.hp_nps} onChange={(e)=>setJacket(s=>({...s,hp_nps:e.target.value}))}>
                <option value='2"'>2"</option><option value='3"'>3"</option>
              </select>
            </label>
          )}
          <label>Nozzle Repad — Hole Ø (mm)
            <input type="number" step="1" value={noz.opening_mm} onChange={(e)=>setNoz(s=>({...s,opening_mm:Number(e.target.value)}))}/>
          </label>
        </div>
      </div>

      {/* Step-1 Results */}
      <div className="card" id="step-1">
        <div className="section-grid">
          <div className="title"><h2><span className="step-badge">Step-1</span> {type==="Batch"?"Batch Sizing":"CSTR/PFR Sizing"}</h2></div>
          <div className="body">
            {type!=="Batch" ? (
              <>
                <ul>
                  <li>τ ≈ {fmt(step1?.tau,2)} s</li>
                  <li>C<sub>A,out</sub> ≈ {fmt(step1?.CA_out,2)} mol/m³</li>
                  <li>V ≈ {fmt(step1?.V,4)} m³</li>
                </ul>
                {type==="CSTR" && step1?.geo && <ul><li><b>Preliminary Vessel Geometry</b></li><li>D ≈ {fmt(step1.geo.D,3)} m; H ≈ {fmt(step1.geo.H,3)} m</li></ul>}
                {type==="PFR" && step1?.geo && <ul><li><b>Preliminary Tube Geometry</b></li><li>L (per tube) ≈ {fmt(step1.geo.L,2)} m; D = {inp.D_tube.toFixed(3)} m; N = {pfr.n_tubes}</li></ul>}
              </>
            ):(
              <ul>
                <li>t ≈ {fmt(step1?.t/60,1)} min</li>
                <li>V ≈ {fmt(step1?.V,3)} m³; D ≈ {fmt(step1?.geo?.D,3)} m; H ≈ {fmt(step1?.geo?.H,3)} m</li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Step-2 Results */}
      <div className="card" id="step-2">
        <div className="section-grid">
          <div className="title"><h2><span className="step-badge">Step-2</span> Energy &amp; Utilities</h2></div>
          <div className="body">
            {eng.mode==="adiabatic" ? (
              <ul>
                <li>T<sub>out</sub> ≈ {fmt(step2.T_out_adiabatic_C,2)} °C</li>
                <li className="small">{step2.note}</li>
              </ul>
            ):(
              <ul>
                <li>Q̇ ≈ <b>{fmt(step2.Q_kW,2)} kW</b> {step2.Q_kW>0?"(remove heat)":"(add heat)"}</li>
                <li>LMTD ≈ {fmt(step2.LMTD_K,2)} K; U = {uti.U_Wm2K} W/m²·K</li>
                <li>A ≈ <b>{fmt(step2.Area_m2,2)} m²</b></li>
                {step2.utilFlow?.type==="water" && <li>Utility ≈ {fmt(step2.utilFlow.m_kg_s,2)} kg/s ({fmt(step2.utilFlow.q_m3_h,2)} m³/h)</li>}
                {step2.utilFlow?.type==="steam" && <li>Steam ≈ {fmt(step2.utilFlow.steam_kg_h,1)} kg/h</li>}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Step-3 Results */}
      <div className="card" id="step-3">
        <div className="section-grid">
          <div className="title"><h2><span className="step-badge">Step-3</span> {type==="PFR"?"Pressure Drop":"Agitation & Mixing"}</h2></div>
          <div className="body">
            {(type==="CSTR"||type==="Batch") ? (
              <>
                <div className="form-subgrid" style={{gridTemplateColumns:"130px 1fr"}}>
                  <label>μ (Pa·s)<input type="number" step="0.0001" name="mu_Pa_s" value={mix.mu_Pa_s} onChange={handleMix}/></label>
                  <label>Impeller
                    <select name="impeller" value={mix.impeller} onChange={handleMix}>
                      <option value="PBT45">Pitched Blade (45°)</option>
                      <option value="Rushton">Rushton</option>
                      <option value="Hydrofoil">Hydrofoil</option>
                    </select>
                  </label>
                  <label>N (rpm)<input type="number" step="1" name="N_rpm" value={mix.N_rpm} onChange={handleMix}/></label>
                  <label>D<sub>i</sub>/D<input type="number" step="0.01" name="Di_over_D" value={mix.Di_over_D} onChange={handleMix}/></label>
                  <label>Service Factor<input type="number" step="0.05" name="SF" value={mix.SF} onChange={handleMix}/></label>
                  <label className="checkbox"><input type="checkbox" name="baffles" checked={mix.baffles} onChange={handleMix}/> 4 baffles (w≈0.1D)</label>
                </div>
                <ul>
                  <li>D ≈ {fmt(step1?.geo?.D,3)} m; D<sub>i</sub> ≈ {fmt(mixing?.Di,3)} m</li>
                  <li>Re ≈ {fmt(mixing?.Re,0)}; Po ≈ {Number.isFinite(mixing?.Po)?mixing.Po.toFixed(2):"-"}</li>
                  <li>P ≈ <b>{fmt(mixing?.P_kW,2)} kW</b>; Motor ≈ <b>{mixing?.motor}</b> kW (SF)</li>
                  <li>Torque ≈ {fmt(mixing?.T_Nm,1)} N·m; Tip speed ≈ {fmt(mixing?.tip,2)} m/s</li>
                  <li>Clearance ≈ {fmt(mixing?.clearance,3)} m; Baffle ≈ {fmt(mixing?.baffle_w,3)} m; Shaft Ø ≈ {fmt(mixing?.d_shaft_m*1000,1)} mm</li>
                </ul>
              </>
            ):(
              <>
                <div className="form-subgrid" style={{gridTemplateColumns:"160px 1fr"}}>
                  <label>Roughness ε (m)<input type="number" step="0.000001" name="roughness_m" value={pfr.roughness_m} onChange={handlePfr}/></label>
                  <label>Parallel Tubes<input type="number" step="1" name="n_tubes" value={pfr.n_tubes} onChange={handlePfr}/></label>
                </div>
                <ul>
                  <li>Velocity ≈ {fmt(pfrDP?.vel,2)} m/s; Re ≈ {fmt(pfrDP?.Re,0)}; f ≈ {fmt(pfrDP?.f,4)}</li>
                  <li>L (per tube) ≈ {fmt(pfrDP?.L,1)} m; ΔP ≈ <b>{fmt(pfrDP?.dP_kPa,1)} kPa</b> ({fmt(pfrDP?.dP_bar,3)} bar)</li>
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Step-4 Results */}
      <div className="card" id="step-4">
        <div className="section-grid">
          <div className="title"><h2><span className="step-badge">Step-4</span> Materials &amp; Thickness</h2></div>
          <div className="body">
            <div className="form-subgrid" style={{gridTemplateColumns:"160px 1fr"}}>
              <label>MOC
                <select name="MOC" value={mech.MOC} onChange={handleMech}>
                  <option value="CS">Carbon Steel</option>
                  <option value="SS304L">SS304L</option>
                  <option value="SS316L">SS316L</option>
                  <option value="Duplex2205">Duplex 2205</option>
                  <option value="HastC276">Hastelloy C-276</option>
                </select>
              </label>
              <label>Allowable S (MPa)<input type="number" step="1" name="S_MPa" value={mech.S_MPa} onChange={handleMech}/></label>
              <label>Joint efficiency E<input type="number" step="0.01" name="E_weld" value={mech.E_weld} onChange={handleMech}/></label>
              <label>Corrosion Allow (mm)<input type="number" step="0.1" name="CA_mm" value={mech.CA_mm} onChange={handleMech}/></label>
              <label>Design P (bar g)<input type="number" step="0.1" name="P_design_bar" value={mech.P_design_bar} onChange={handleMech}/></label>
              <label>Design T (°C)<input type="number" step="0.1" name="T_design_C" value={mech.T_design_C} onChange={handleMech}/></label>
              <label>Head Type
                <select name="headType" value={mech.headType} onChange={handleMech}>
                  <option value="E2:1">2:1 Ellipsoidal</option>
                  <option value="Hemi" disabled>Hemispherical</option>
                  <option value="Toris" disabled>Torispherical</option>
                </select>
              </label>
              <label>ΔT (jacket − reactor) K<input type="number" step="0.1" name="dT_jacket_K" value={mech.dT_jacket_K} onChange={handleMech}/></label>
            </div>
            <ul>
              <li>Shell t_req ≈ {fmt(step4.t_shell,1)} mm → <b>{step4.t_shell_sel} mm</b></li>
              <li>Head t_req ≈ {fmt(step4.t_head,1)} mm → <b>{step4.t_head_sel} mm</b></li>
              <li>σ<sub>th</sub> ≈ {fmt(step4.sigma_th,1)} MPa; risk <b>{step4.risk}</b> vs S = {step4.S} MPa</li>
              <li className="small">Thin-wall pre-checks. Final values per ASME VIII with loads/wind/seismic and fabrication tolerances.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Step-5 Results */}
      <div className="card">
        <div className="section-grid">
          <div className="title"><h2><span className="step-badge">Step-5</span> Supports, Jacket &amp; Accessories</h2></div>
          <div className="body">
            <ul>
              <li>Total weight ≈ {fmt(supports.W_kN,1)} kN (vessel {fmt(supports.vesselMass,0)} kg + contents {fmt(supports.contentMass,0)} kg)</li>
              {supports.mode==="Legs" && supports.legs && (<><li>{supports.legs.n} legs; per-leg load ≈ {fmt(supports.legs.perLeg_kN,1)} kN</li><li>Req. steel area ≥ {fmt(supports.legs.A_leg_req_mm2,0)} mm² per leg</li></>)}
              {supports.mode==="Skirt" && supports.skirt && (<li>Skirt t_req ≈ {fmt(supports.skirt.t_req_mm,1)} mm → <b>{supports.skirt.t_sel_mm} mm</b></li>)}
            </ul>
            <h3>Jacket & Utility Headers</h3>
            <ul>
              {jacketCalc?.type==="Half-pipe" && (<><li>Half-pipe {jacket.hp_nps}: length ≈ <b>{fmt(jacketCalc.L_req,1)} m</b></li><li>Pitch ≈ <b>{fmt(jacketCalc.pitch_m,3)} m/turn</b> ({fmt(jacketCalc.turns,0)} turns)</li></>)}
              {jacketCalc?.type==="Dimple" && <li>Dimple coverage ≈ <b>{fmt(jacketCalc.coverage_pct,0)}%</b></li>}
              {headers && (<li>Utility header ({headers.fluid}) → <b>{headers.header.nps}</b> | v ≈ {fmt(headers.header.v,2)} m/s</li>)}
            </ul>
            <h3>Nozzle Repad (Rule-of-Thumb)</h3>
            <ul>
              <li>Opening Ø = {repad.doMM} mm; shell t = {repad.ts} mm → pad t = <b>{repad.tp} mm</b>, width w ≈ <b>{repad.w} mm</b> (OD ≈ <b>{repad.od} mm</b>)</li>
              <li className="small">Final area replacement per ASME UG-37.</li>
            </ul>
            <h3>Nozzles & Instruments (Starter List)</h3>
            <ul>
              {[
                { tag:"N1", service:`Feed Inlet (with FCV)`, size: mainLine.nps },
                { tag:"N2", service:`Product Outlet`, size: mainLine.nps },
                { tag:"N3", service:`Vent/PSV on top head`, size:'1½"' },
                { tag:"N4", service:`Drain/Bottom`, size:'1"' },
                { tag:"N5", service:`Manhole (DN400) on shell`, size:'DN400' },
                { tag:"N6", service:`Thermowell (TT)`, size:'½"-FNPT' },
                { tag:"N7", service:`Pressure (PT/PIT)`, size:'½"-FNPT' },
                { tag:"N8", service:`Level (LT/LIT)`, size:'¾"-FNPT' },
                { tag:"N9", service:`Jacket In/Out`, size:'1½"' },
              ].map(n => <li key={n.tag}><b>{n.tag}</b> — {n.service} — <i>{n.size}</i></li>)}
            </ul>
          </div>
        </div>
      </div>

      {/* HMBD / P&ID */}
      <div className="card" id="pandid">
        <h2>Auto HMBD / P&ID Preview</h2>
        <div className="svg-frame">
          <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 420" width="100%">
            <style>{`
              .ink{stroke:#111827;stroke-width:3;fill:none;stroke-linecap:round;stroke-linejoin:round}
              .tank{fill:#F3F4F6;stroke:#111827;stroke-width:4}
              .txt{font:12px system-ui, -apple-system, Segoe UI, Roboto, Arial}
              .blue{stroke:#2563EB}
              .org{stroke:#F59E0B}
            `}</style>

            {/* Vessel */}
            <rect x="80" y="110" width="220" height="220" rx="6" className="tank"/>
            <path d="M300,150 H80" className="ink"/>
            <path d="M80,110 a110,110 0 0 1 220,0" className="ink"/>

            {/* Mixer */}
            <line x1="190" y1="160" x2="190" y2="300" className="ink"/>
            <circle cx="190" cy="230" r="20" fill="#fff" className="ink"/>
            <text x="190" y="100" textAnchor="middle" className="txt">CSTR D≈{fmt(step1?.geo?.D,2)}m</text>

            {/* Feed + FIT */}
            <path d="M40,230 H80" className="ink"/>
            <path d="M40,230 H70" className="blue ink" style={{strokeWidth:4}}/>
            <circle cx="58" cy="230" r="10" fill="#fff" className="ink"/>
            <text x="20" y="215" className="txt">Feed {mainLine.nps}</text>
            <text x="22" y="234" className="txt">FIT</text>

            {/* Product + FCV */}
            <path d="M300,230 H420" className="org ink" style={{strokeWidth:4}}/>
            <line x1="330" y1="220" x2="330" y2="240" className="ink"/>
            <text x="320" y="210" className="txt">FCV</text>
            <text x="360" y="215" className="txt">To downstream</text>

            {/* Jacket utility */}
            <path d="M210,110 V70 H470 V260" className="blue ink" style={{strokeWidth:4}}/>
            <path d="M300,260 H470" className="org ink" style={{strokeWidth:4}}/>
            <text x="475" y="260" className="txt">{utilStr}</text>

            {/* Instruments */}
            <text x="310" y="125" className="txt">TT/TIC</text>
            <text x="85" y="335" className="txt">LIT</text>
            <text x="260" y="95" className="txt">PSV</text>

            {/* Data box */}
            <rect x="520" y="80" width="420" height="260" rx="8" fill="#fff" stroke="#e5e7eb"/>
            <text x="530" y="105" className="txt" fontWeight="bold">Design Summary</text>
            <text x="530" y="125" className="txt">V={ fmt(type==="Batch"?step1?.V:step1?.V,3) } m³; τ={ type!=="Batch"?fmt(step1?.tau,1):"-" } s; X={inp.X}</text>
            <text x="530" y="145" className="txt">Q={ eng.mode==="isothermal" ? fmt(step2?.Q_kW,1)+" kW" : "Adiabatic" } ; A={ eng.mode==="isothermal" ? fmt(step2?.Area_m2,2)+" m²": "-" }</text>
            <text x="530" y="165" className="txt">Motor≈{ mixing?.motor?.toFixed ? mixing.motor.toFixed(2) : fmt(mixing?.motor,2) } kW; Re≈{mixing?.Re?fmt(mixing.Re,0):"-"}</text>
            <text x="530" y="185" className="txt">MOC {mech.MOC}; Shell t {step4.t_shell_sel} mm; Head t {step4.t_head_sel} mm</text>
            <text x="530" y="205" className="txt">P={mech.P_design_bar} barg; S={step4.S} MPa; E={step4.E}</text>
          </svg>
        </div>

        <div className="actions-bar">
          <div className="actions-inner">
            <button className="presale-button" onClick={downloadSVG}>Download SVG</button>
            <button className="presale-button" onClick={printPDF}>Print PDF</button>
            <button className="presale-button" onClick={printBoM}>Print BoM</button>
            <button className="presale-button" onClick={downloadBOMCsv}>Download BoM CSV</button>
          </div>
        </div>
      </div>

      {/* Assumptions */}
      <div className="card">
        <h3>Assumptions</h3>
        <ul>
          <li>ASME VIII-1 thin-wall pre-checks: shell t = PR/(SE−0.6P); 2:1 head t = PD/(2SE−0.2P) with P in MPa, R/D in mm.</li>
          <li>Thermal stress σ<sub>th</sub> ≈ E·α·ΔT/(1−ν)·k (k≈0.3). If σ<sub>th</sub> &gt; 0.67·S → add loops/expansion.</li>
          <li>Final design requires full code calc, loads, NDT category, wind/seismic, and fabricator allowances.</li>
        </ul>
      </div>
    </div>
  );
}

