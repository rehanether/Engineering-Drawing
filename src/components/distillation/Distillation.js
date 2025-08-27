import React, { useMemo, useState } from "react";
import "./Distillation.css";
import DistillationHMBD from "./DistillationHMBD";
import PSVSizing from "./PSVSizing";
import DistillationDatasheet from "./DistillationDatasheet";

/* ---------------- property packs (Antoine in mmHg, °C) ---------------- */
const sysDB = {
  Custom: null,
  "Benzene/Toluene": {
    LK: { name: "Benzene",  MW: 78.11, rhoL: 876,  Antoine: { A: 6.90565, B: 1211.033, C: 220.79 },  lambda_kJkg: 394 },
    HK: { name: "Toluene",  MW: 92.14, rhoL: 867,  Antoine: { A: 6.95464, B: 1344.80, C: 219.48 },  lambda_kJkg: 351 }
  },
  "Hexane/Heptane": {
    LK: { name: "n-Hexane", MW: 86.18, rhoL: 655,  Antoine: { A: 6.8763,  B: 1171.53, C: 224.0 },   lambda_kJkg: 334 },
    HK: { name: "n-Heptane",MW:100.21, rhoL: 684,  Antoine: { A: 6.8930,  B: 1264.00, C: 216.0 },   lambda_kJkg: 317 }
  },
  "Ethanol/Water": {
    LK: { name: "Ethanol",  MW: 46.07, rhoL: 789,  Antoine: { A: 8.20417, B: 1642.89, C: 230.30 },  lambda_kJkg: 841 },
    HK: { name: "Water",    MW: 18.02, rhoL: 997,  Antoine: { A: 8.14019, B: 1810.94, C: 244.485 }, lambda_kJkg: 2257 }
  }
};

// Psat (mmHg) from Antoine
const Psat = (A, B, C, Tc) => Math.pow(10, A - B / (Tc + C));

// dew-T solver for binary
function dewT_from_xP(xL, comps, PkPa) {
  const Pmm = PkPa * (760 / 101.325);
  let lo = -10, hi = 200;
  for (let i = 0; i < 70; i++) {
    const mid = 0.5 * (lo + hi);
    const sum = xL * Psat(comps.LK.A, comps.LK.B, comps.LK.C, mid)
              + (1 - xL) * Psat(comps.HK.A, comps.HK.B, comps.HK.C, mid);
    (sum > Pmm) ? (hi = mid) : (lo = mid);
  }
  return 0.5 * (lo + hi);
}

/* ---------------- helpers ---------------- */
const clamp01 = v => Math.max(0, Math.min(1, Number(v) || 0));
const safe = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const ln = Math.log;
const Rgas = 8.314; // J/mol·K

/* ---------------- FUG ---------------- */
function fenskeNmin(alpha, xD, xB) {
  alpha = Math.max(1.001, alpha);
  xD = clamp01(xD); xB = clamp01(xB);
  const num = ln((xD / (1 - xD)) * ((1 - xB) / xB));
  const den = ln(alpha);
  return Math.max(0, num / Math.max(den, 1e-9));
}
function underwoodTheta(alpha, zF, q = 1) {
  alpha = Math.max(1.001, alpha);
  zF = clamp01(zF);
  q = Math.max(0, Math.min(1.2, Number(q) || 1));
  const f = (t) => q * (zF / (alpha - t) + (1 - zF) / (1 - t)) - 1;
  let lo = 1e-6, hi = 1 - 1e-6, flo = f(lo), fhi = f(hi);
  if (flo * fhi > 0) return null;
  for (let i = 0; i < 100; i++) {
    const mid = 0.5*(lo+hi), fm = f(mid);
    if (Math.abs(fm) < 1e-10) return mid;
    if (flo * fm < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return 0.5 * (lo + hi);
}
function underwoodRmin(alpha, xD, theta) {
  if (!Number.isFinite(theta)) return null;
  alpha = Math.max(1.001, alpha);
  xD = clamp01(xD);
  const termLK = (xD * alpha) / Math.max(alpha - theta, 1e-9);
  const termHK = ((1 - xD) * 1) / Math.max(1 - theta, 1e-9);
  const Rmin = termLK + termHK - 1;
  return (Rmin > 0 && Number.isFinite(Rmin)) ? Rmin : null;
}
function gillilandN(Nmin, R, Rmin) {
  Nmin = Math.max(0, Nmin);
  if (Rmin == null || !R) return null;
  const Y = (R - Rmin) / Math.max(R + 1, 1e-9);
  const X = 1 - Math.exp(((1 + 54.4 * Y) / (11 + 117.2 * Y)) * (Y - 1));
  return Math.max((Nmin + X) / Math.max(1 - X, 1e-9), Nmin);
}

/* ---------------- LMTD ---------------- */
function lmtd(dt1, dt2) {
  const e = 1e-9;
  if (dt1 <= e || dt2 <= e) return null;
  if (Math.abs(dt1 - dt2) < 1e-6) return dt1;
  return (dt1 - dt2) / Math.log(dt1 / dt2);
}

/* ---------------- Defaults + reset ---------------- */
const DEFAULTS = Object.freeze({
  system: "Benzene/Toluene",
  feedFlow: "100", zF: "0.50", xD: "0.95", xB: "0.05", alpha: "2.5", q: "1.00", RR: "1.30",

  internals: "trays",
  effMV: "0.70", traySpacing_m: "0.50", dpTray_mbar: "3", Ksb: "0.11", flood: "0.80",
  HETP_m: "0.50", packDP_mbarpm: "0.40",

  Ptop_kPa: "101", Ttop_C: "", rhoV_top: "", rhoL_top: "",
  Pbot_kPa: "120", Tbot_C: "",

  cwTin_C: "30", cwDeltaT_K: "10", Uc_Wm2K: "500", Ur_Wm2K: "1500",
  steamLat_kJkg: "2100", steamTsat_C: "180",

  MW_LK: "", MW_HK: "", rhoD_kgm3: "700", drumHoldup_min: "5",
  MOC: "SS316L"
});

/* ===================================================================== */

export default function Distillation(){
  const [inps, setInps] = useState(DEFAULTS);
  const onChange = e => setInps(s => ({ ...s, [e.target.name]: e.target.value }));
  const num = (v, d = 2) => (v || v === 0) ? (+v).toFixed(d) : "—";

  const calc = useMemo(() => {
    // parse
    const sys = sysDB[inps.system];
    const F = safe(inps.feedFlow, 100);
    const zF = clamp01(inps.zF), xD = clamp01(inps.xD), xB = clamp01(inps.xB);
    const alpha = Math.max(1.001, safe(inps.alpha, 2.5));
    const q = Math.max(0, Math.min(1.2, safe(inps.q, 1)));
    const RR = Math.max(1.05, safe(inps.RR, 1.3));
    const Ptop = safe(inps.Ptop_kPa, 101), Pbot = safe(inps.Pbot_kPa, 120);

    // auto temps/densities
    let Ttop_auto = null, Tbot_auto = null, rhoV_auto = null, rhoL_auto = null;
    let MW_LK = sys?.LK.MW ?? safe(inps.MW_LK, 78);
    let MW_HK = sys?.HK.MW ?? safe(inps.MW_HK, 92);
    const rhoL_LK = sys?.LK.rhoL ?? 650, rhoL_HK = sys?.HK.rhoL ?? 700;
    const lambda_LK = sys?.LK.lambda_kJkg ?? 350, lambda_HK = sys?.HK.lambda_kJkg ?? 350;

    if (sys){
      const comps = { LK: sys.LK.Antoine, HK: sys.HK.Antoine };
      Ttop_auto = dewT_from_xP(xD, comps, Ptop);
      Tbot_auto = dewT_from_xP(xB, comps, Pbot);
      const MWmix_top = xD * MW_LK + (1 - xD) * MW_HK;
      const TtopK = 273.15 + Ttop_auto;
      rhoV_auto = (Ptop * 1000) * (MWmix_top / 1000) / (Rgas * TtopK);
      rhoL_auto = xD * rhoL_LK + (1 - xD) * rhoL_HK;
    }

    const Ttop = inps.Ttop_C !== "" ? safe(inps.Ttop_C, 78) : (Ttop_auto ?? 78);
    const Tbot = inps.Tbot_C !== "" ? safe(inps.Tbot_C, 95) : (Tbot_auto ?? 95);
    const rhoV = inps.rhoV_top !== "" ? safe(inps.rhoV_top, 1.5) : (rhoV_auto ?? 1.5);
    const rhoL = inps.rhoL_top !== "" ? safe(inps.rhoL_top, 650) : (rhoL_auto ?? 650);

    // FUG
    const Nmin = fenskeNmin(alpha, xD, xB);
    const theta = underwoodTheta(alpha, zF, q);
    const Rmin = underwoodRmin(alpha, xD, theta);
    const badSpecs = (Rmin === null);
    const R = !badSpecs ? RR * Rmin : null;
    const Nth = (!badSpecs && R) ? gillilandN(Nmin, R, Rmin) : null;

    // balances
    const D = xD !== xB ? F * (zF - xB) / Math.max(xD - xB, 1e-9) : 0;
    const B = Math.max(F - D, 0);
    const Vkmolph = (R && D) ? (R + 1) * D : 0;

    // duties
    const Ld_kJkmol = (xD * lambda_LK * MW_LK + (1 - xD) * lambda_HK * MW_HK);
    const Lb_kJkmol = (xB * lambda_LK * MW_LK + (1 - xB) * lambda_HK * MW_HK);
    const Qc_kJph = Vkmolph * Ld_kJkmol;
    const Qr_kJph = (Vkmolph + B) * Lb_kJkmol;

    // hydraulics
    const effMV = Math.max(0.3, Math.min(1, safe(inps.effMV, 0.7)));
    const traySpacing = Math.max(0.3, safe(inps.traySpacing_m, 0.5));
    const dpTray = Math.max(0.5, safe(inps.dpTray_mbar, 3));
    const Ksb = Math.max(0.05, safe(inps.Ksb, 0.11));
    const flood = Math.max(0.5, Math.min(0.95, safe(inps.flood, 0.8)));
    const HETP = Math.max(0.15, safe(inps.HETP_m, 0.5));
    const packDP = Math.max(0.05, safe(inps.packDP_mbarpm, 0.4));
    const internals = inps.internals;

    const vdot_m3s = (Vkmolph * 1000 / 3600) * (Rgas * (273.15 + Ttop)) / (Ptop * 1000);
    const Vallow = Ksb * Math.sqrt(Math.max((rhoL - rhoV), 1) / Math.max(rhoV, 1e-9)) * flood;
    const area = Vallow > 0 ? vdot_m3s / Vallow : 0;
    const Dcol = area > 0 ? Math.sqrt(4 * area / Math.PI) : 0;

    let Nactual = null, Hcol = null, dP_tray = null, Hpack = null, dP_pack = null;
    if (Nth && internals === "trays") {
      Nactual = Math.ceil(Nth / effMV);
      Hcol = Nactual * traySpacing;
      dP_tray = Nactual * dpTray;
    }
    if (Nth && internals === "packing") {
      Hpack = Nth * HETP;
      dP_pack = Hpack * packDP;
    }

    // utilities / HX
    const cwTin = safe(inps.cwTin_C, 30), dTcw = safe(inps.cwDeltaT_K, 10), cwTout = cwTin + dTcw;
    const Uc = safe(inps.Uc_Wm2K, 500), Ur = safe(inps.Ur_Wm2K, 1500);
    const steamLat = safe(inps.steamLat_kJkg, 2100), steamTsat = safe(inps.steamTsat_C, 180);

    const mCW_kgph = dTcw > 0 ? Qc_kJph / (4.18 * dTcw) : 0;
    const LMTD_c = lmtd(Math.max(0.1, Ttop - cwTout), Math.max(0.1, Ttop - cwTin));
    const Ac = (Uc > 0 && LMTD_c) ? (Qc_kJph * 1000 / 3600) / (Uc * LMTD_c) : null;

    const dTr = Math.max(0.1, steamTsat - Tbot);
    const LMTD_r = dTr;
    const Ar = (Ur > 0 && LMTD_r) ? (Qr_kJph * 1000 / 3600) / (Ur * LMTD_r) : null;
    const mSteam = steamLat > 0 ? Qr_kJph / steamLat : 0;

    // drum
    const MWmixD = xD * MW_LK + (1 - xD) * MW_HK;
    const rhoD = safe(inps.rhoD_kgm3, 700);
    const Vdrum = ((D * MWmixD) / rhoD) * (safe(inps.drumHoldup_min, 5) / 60);

    return {
      F, zF, xD, xB, alpha, q, RR, internals, system: inps.system,
      Nmin, theta, Rmin, R, Nth, badSpecs,
      D, B, Vkmolph, Qc_kJph, Qr_kJph,
      Ttop, Tbot, rhoV, rhoL, Ttop_auto, Tbot_auto, rhoV_auto, rhoL_auto,
      vdot_m3s, Vallow, area, Dcol, effMV, traySpacing,
      Nactual, Hcol, dP_tray, Hpack, dP_pack,
      cwTin, cwTout, dTcw, Uc, Ur, LMTD_c, LMTD_r, mCW_kgph, Ac, Ar, mSteam,
      MWmixD, Vdrum,
      MOC: inps.MOC
    };
  }, [inps]);

  const resetAll = () => setInps(DEFAULTS);
  const label = (name, text, props = {}) => (
    <label>
      {text}
      <input name={name} value={inps[name]} onChange={onChange} {...props}/>
    </label>
  );

  return (
    <div className="product-detail distillation-content">
      <div className="topbar">
        <div className="crumbs">HMBD/P&ID</div>
        <button className="reset-btn" onClick={resetAll} title="Reset to defaults">Reset</button>
      </div>

      <h1>Distillation Column Design</h1>
      <p className="subtitle">
        Property packs + FUG sizing, hydraulics, utilities, HX areas, HMBD export, PSV stub, and printable datasheet.
      </p>

      {/* ===== Four equal cards ===== */}
      <div className="form-section">
        <div className="form-block">
          <h3>System & Specs</h3>
          <label className="row">
            System
            <select name="system" value={inps.system} onChange={onChange}>
              {Object.keys(sysDB).map(k => <option key={k}>{k}</option>)}
            </select>
          </label>
          {label("feedFlow","Feed F (kmol/h)",{type:"number",step:"0.1"})}
          {label("zF","zF (LK in feed)",{type:"number",step:"0.01"})}
          {label("xD","xD (distillate LK)",{type:"number",step:"0.01"})}
          {label("xB","xB (bottoms LK)",{type:"number",step:"0.01"})}
          {label("alpha","Rel. volatility α",{type:"number",step:"0.01"})}
          {label("q","Feed quality q",{type:"number",step:"0.05"})}
          {label("RR","Reflux factor R/Rmin",{type:"number",step:"0.05"})}
        </div>

        <div className="form-block">
          <h3>Operating Conditions</h3>
          {label("Ptop_kPa","Top pressure (kPa)",{type:"number"})}
          <label>AUTO T<sub>top</sub>: <b>{calc.Ttop_auto ? num(calc.Ttop_auto,2) : "—"}</b> °C</label>
          {label("Ttop_C","T_top override (°C)",{type:"number"})}
          <label>AUTO ρ<sub>v</sub>: <b>{calc.rhoV_auto ? num(calc.rhoV_auto,3) : "—"}</b> kg/m³</label>
          {label("rhoV_top","ρ_v override (kg/m³)",{type:"number",step:"0.01"})}
          <label>AUTO ρ<sub>l</sub>: <b>{calc.rhoL_auto ? num(calc.rhoL_auto,0) : "—"}</b> kg/m³</label>
          {label("rhoL_top","ρ_l override (kg/m³)",{type:"number"})}
          {label("Pbot_kPa","Bottom pressure (kPa)",{type:"number"})}
          <label>AUTO T<sub>bot</sub>: <b>{calc.Tbot_auto ? num(calc.Tbot_auto,2) : "—"}</b> °C</label>
          {label("Tbot_C","T_bot override (°C)",{type:"number"})}
        </div>

        <div className="form-block">
          <h3>Internals</h3>
          <label className="row">
            Type
            <select name="internals" value={inps.internals} onChange={onChange}>
              <option value="trays">Trays</option>
              <option value="packing">Structured packing</option>
            </select>
          </label>
          {inps.internals==="trays" ? (
            <>
              {label("effMV","Murphree eff (0–1)",{type:"number",step:"0.01"})}
              {label("traySpacing_m","Tray spacing (m)",{type:"number",step:"0.05"})}
              {label("dpTray_mbar","ΔP/tray (mbar)",{type:"number",step:"0.1"})}
              {label("Ksb","Souders–Brown K (m/s)",{type:"number",step:"0.01"})}
              {label("flood","Design % flood (0.5–0.95)",{type:"number",step:"0.01"})}
            </>
          ) : (
            <>
              {label("HETP_m","HETP (m/stage)",{type:"number",step:"0.05"})}
              {label("packDP_mbarpm","ΔP (mbar/m)",{type:"number",step:"0.05"})}
              {label("Ksb","Capacity K (m/s)",{type:"number",step:"0.01"})}
              {label("flood","Design % flood (0.5–0.95)",{type:"number",step:"0.01"})}
            </>
          )}
          <label className="row">
            MOC
            <select name="MOC" value={inps.MOC} onChange={onChange}>
              <option>SS316L</option><option>SS304</option><option>Carbon Steel</option><option>Duplex</option>
            </select>
          </label>
        </div>

        <div className="form-block">
          <h3>Utilities / HX</h3>
          {label("cwTin_C","CW inlet (°C)",{type:"number",step:"0.5"})}
          {label("cwDeltaT_K","CW rise ΔT (K)",{type:"number",step:"0.5"})}
          {label("Uc_Wm2K","Condenser U (W/m²·K)",{type:"number"})}
          {label("Ur_Wm2K","Reboiler U (W/m²·K)",{type:"number"})}
          {label("steamLat_kJkg","Steam latent (kJ/kg)",{type:"number"})}
          {label("steamTsat_C","Steam Tsat (°C)",{type:"number"})}
          {label("rhoD_kgm3","Distillate ρ (kg/m³)",{type:"number"})}
          {label("drumHoldup_min","Drum holdup (min)",{type:"number"})}
        </div>
      </div>

      {/* ===== Results ===== */}
      <div className="results-section">
        <h2>Design Summary</h2>

        {calc.badSpecs && (
          <div className="todo">
            <b>Check specs:</b> Underwood root not bracketed. Review α, q, z<sub>F</sub>.
          </div>
        )}

        <ul>
          <li>System: <b>{inps.system}</b></li>
          <li>Fenske N<sub>min</sub>: <b>{num(calc.Nmin,2)}</b> | θ: <b>{calc.theta ? num(calc.theta,4) : "—"}</b> | R<sub>min</sub>: <b>{calc.Rmin ? num(calc.Rmin,3) : "—"}</b></li>
          <li>Chosen R: <b>{calc.R ? num(calc.R,3) : "—"}</b> (factor {inps.RR}) → N (theor): <b>{calc.Nth ? num(calc.Nth,1) : "—"}</b></li>
        </ul>

        <h3>Mass Balance</h3>
        <ul>
          <li>F: <b>{num(calc.F,2)}</b> kmol/h | D: <b>{num(calc.D,2)}</b> | B: <b>{num(calc.B,2)}</b></li>
        </ul>

        <h3>Operating (auto → used)</h3>
        <ul>
          <li>T<sub>top</sub>: <b>{calc.Ttop_auto ? num(calc.Ttop_auto,2) : "—"}</b> → <b>{num(calc.Ttop,2)}</b> °C | T<sub>bot</sub>: <b>{calc.Tbot_auto ? num(calc.Tbot_auto,2) : "—"}</b> → <b>{num(calc.Tbot,2)}</b> °C</li>
          <li>ρ<sub>v</sub>: <b>{calc.rhoV_auto ? num(calc.rhoV_auto,3) : "—"}</b> → <b>{num(calc.rhoV,3)}</b> kg/m³ | ρ<sub>l</sub>: <b>{calc.rhoL_auto ? num(calc.rhoL_auto,0) : "—"}</b> → <b>{num(calc.rhoL,0)}</b> kg/m³</li>
        </ul>

        <h3>Hydraulics & Sizing</h3>
        <ul>
          <li>Top v̇ (ideal): <b>{num(calc.vdot_m3s,3)}</b> m³/s | V<sub>SB</sub>@{num(100*safe(inps.flood,0.8),0)}%: <b>{num(calc.Vallow,3)}</b> m/s</li>
          <li>Area: <b>{num(calc.area,3)}</b> m² → Shell ID: <b>{num(calc.Dcol,3)}</b> m</li>
          {inps.internals==="trays" ? (
            <>
              <li>Eff: <b>{num(calc.effMV*100,0)}%</b> → Actual trays: <b>{calc.Nactual ?? "—"}</b> | Height: <b>{calc.Hcol ? num(calc.Hcol,1) : "—"} m</b></li>
              <li>Total ΔP (trays): <b>{calc.dP_tray ? num(calc.dP_tray,0) : "—"} mbar</b></li>
            </>
          ) : (
            <>
              <li>Packing height (HETP {inps.HETP_m}): <b>{calc.Hpack ? num(calc.Hpack,1) : "—"} m</b></li>
              <li>Total ΔP (packing): <b>{calc.dP_pack ? num(calc.dP_pack,0) : "—"} mbar</b></li>
            </>
          )}
        </ul>

        <h3>Energy & Utilities</h3>
        <ul>
          <li>Qc: <b>{num(calc.Qc_kJph,0)}</b> kJ/h | Qr: <b>{num(calc.Qr_kJph,0)}</b> kJ/h</li>
          <li>CW (ΔT {inps.cwDeltaT_K} K): <b>{num(calc.mCW_kgph,0)}</b> kg/h</li>
          <li>Steam (λ {inps.steamLat_kJkg}): <b>{num(calc.mSteam,0)}</b> kg/h</li>
          <li>Condenser: LMTD=<b>{calc.LMTD_c ? num(calc.LMTD_c,1) : "—"}</b> → Area <b>{calc.Ac ? num(calc.Ac,2) : "—"} m²</b></li>
          <li>Reboiler: ΔT≈<b>{calc.LMTD_r ? num(calc.LMTD_r,1) : "—"}</b> → Area <b>{calc.Ar ? num(calc.Ar,2) : "—"} m²</b></li>
        </ul>

        <h3>Reflux Drum</h3>
        <ul>
          <li>MW<sub>D</sub> ≈ <b>{num(calc.MWmixD,1)}</b> kg/kmol | Holdup {inps.drumHoldup_min} min → <b>{calc.Vdrum ? num(calc.Vdrum,2) : "—"} m³</b></li>
        </ul>

        <h3>HMBD (Auto)</h3>
        <DistillationHMBD data={calc} />
        <button
          className="export-btn"
          onClick={() => {
            const svg = document.querySelector(".distillation-content svg");
            if (!svg) return;
            const xml = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => {
              const c = document.createElement("canvas");
              const vb = svg.viewBox.baseVal;
              c.width = vb && vb.width ? vb.width : 900;
              c.height = vb && vb.height ? vb.height : 320;
              const ctx = c.getContext("2d");
              ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,c.width,c.height);
              ctx.drawImage(img,0,0); URL.revokeObjectURL(url);
              const png = c.toDataURL("image/png");
              const a = document.createElement("a"); a.href = png; a.download = "HMBD_distillation.png"; a.click();
            };
            img.src = url;
          }}
        >
          Download HMBD PNG
        </button>

        <h3>Relief (API 520/521 — stub)</h3>
        <PSVSizing defaults={{ Trel_K: 273.15 + (calc.Ttop ?? 80) }} />

        <h3>Datasheets</h3>
        <DistillationDatasheet inputs={inps} data={calc} />

        <div className="codes">
          <h4>Codes & Standards</h4>
          <p>
            ASME Sec VIII Div.1, ASME B31.3, TEMA, API 520/521, ISA 5.1, IEC 60079 / NEC,
            NACE MR0175/ISO 15156, ASME BPE (pharma). MOC default: {calc.MOC}.
          </p>
        </div>
      </div>
    </div>
  );
}


