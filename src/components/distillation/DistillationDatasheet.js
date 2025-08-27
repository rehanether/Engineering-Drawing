import React from "react";

/**
 * Printable datasheet (use browser "Save as PDF")
 * Includes: Design basis, key results, hydraulics, utilities, HX areas.
 * Adds a diagonal watermark "engineeringdrawing.io" on print/PDF.
 */
export default function DistillationDatasheet({ inputs, data }) {
  const num = (v, d = 2) => (v || v === 0) ? Number(v).toFixed(d) : "—";

  const printPDF = () => {
    const w = window.open("", "print");
    if (!w) return;
    const html = `
<!doctype html><html><head>
<meta charset="utf-8"/>
<title>Distillation Datasheet</title>
<style>
  body{font-family:Inter,system-ui,Arial,sans-serif;color:#0f172a}
  h1{font-size:20px;margin:0 0 8px}
  h2{font-size:16px;margin:12px 0 6px}
  table{width:100%;border-collapse:collapse;margin:4px 0}
  th,td{border:1px solid #e5e7eb;padding:6px 8px;font-size:12px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .box{border:1px solid #e5e7eb;border-radius:10px;padding:10px}
  .muted{color:#475569}

  /* watermark */
  .wm{
    position: fixed;
    top: 40%;
    left: -10%;
    width: 130%;
    text-align: center;
    transform: rotate(-30deg);
    opacity: 0.06;
    font-size: 80px;
    color: #0f172a;
    z-index: 0;
    pointer-events: none;
  }
  .content{ position: relative; z-index: 1; }
</style>
</head><body>
  <div class="wm">engineeringdrawing.io</div>

  <div class="content">
  <h1>Distillation Column Datasheet</h1>
  <div class="muted">EDG · Industry 4.0 · On-Chain Transparency</div>

  <div class="grid">
    <div class="box">
      <h2>Design Basis</h2>
      <table>
        <tr><td>System</td><td>${inputs.system}</td></tr>
        <tr><td>Feed F (kmol/h)</td><td>${inputs.feedFlow}</td></tr>
        <tr><td>zF</td><td>${inputs.zF}</td></tr>
        <tr><td>xD / xB</td><td>${inputs.xD} / ${inputs.xB}</td></tr>
        <tr><td>α (LK/HK)</td><td>${inputs.alpha}</td></tr>
        <tr><td>q</td><td>${inputs.q}</td></tr>
        <tr><td>R/Rmin</td><td>${inputs.RR}</td></tr>
        <tr><td>Ptop / Pbot (kPa)</td><td>${inputs.Ptop_kPa} / ${inputs.Pbot_kPa}</td></tr>
        <tr><td>Ttop / Tbot (°C)</td><td>${num(data.Ttop,2)} / ${num(data.Tbot,2)}</td></tr>
        <tr><td>MOC</td><td>${inputs.MOC}</td></tr>
      </table>
    </div>
    <div class="box">
      <h2>Key Results</h2>
      <table>
        <tr><td>Nmin</td><td>${num(data.Nmin,2)}</td></tr>
        <tr><td>θ (Underwood)</td><td>${data.theta?num(data.theta,4):"—"}</td></tr>
        <tr><td>Rmin / R</td><td>${data.Rmin?num(data.Rmin,3):"—"} / ${data.R?num(data.R,3):"—"}</td></tr>
        <tr><td>N (theor)</td><td>${data.Nth?num(data.Nth,1):"—"}</td></tr>
        ${inputs.internals==="trays"
          ? `<tr><td>Actual trays</td><td>${data.Nactual??"—"}</td></tr>
             <tr><td>Height (m)</td><td>${data.Hcol?num(data.Hcol,1):"—"}</td></tr>
             <tr><td>ΔP (mbar)</td><td>${data.dP_tray?num(data.dP_tray,0):"—"}</td></tr>`
          : `<tr><td>Packing height (m)</td><td>${data.Hpack?num(data.Hpack,1):"—"}</td></tr>
             <tr><td>ΔP (mbar)</td><td>${data.dP_pack?num(data.dP_pack,0):"—"}</td></tr>`}
        <tr><td>Shell ID (m)</td><td>${num(data.Dcol,3)}</td></tr>
      </table>
    </div>
  </div>

  <div class="grid">
    <div class="box">
      <h2>Mass & Energy</h2>
      <table>
        <tr><td>D / B (kmol/h)</td><td>${num(data.D,2)} / ${num(data.B,2)}</td></tr>
        <tr><td>Qc / Qr (kJ/h)</td><td>${num(data.Qc_kJph,0)} / ${num(data.Qr_kJph,0)}</td></tr>
        <tr><td>ρv / ρl (kg/m³)</td><td>${num(data.rhoV,3)} / ${num(data.rhoL,0)}</td></tr>
      </table>
    </div>
    <div class="box">
      <h2>Utilities & HX</h2>
      <table>
        <tr><td>CW ΔT (K) / flow (kg/h)</td><td>${inputs.cwDeltaT_K} / ${num(data.mCW_kgph,0)}</td></tr>
        <tr><td>Steam rate (kg/h)</td><td>${num(data.mSteam,0)}</td></tr>
        <tr><td>Condenser LMTD (K) / Area (m²)</td><td>${data.LMTD_c?num(data.LMTD_c,1):"—"} / ${data.Ac?num(data.Ac,2):"—"}</td></tr>
        <tr><td>Reboiler ΔT (K) / Area (m²)</td><td>${data.LMTD_r?num(data.LMTD_r,1):"—"} / ${data.Ar?num(data.Ar,2):"—"}</td></tr>
        <tr><td>Reflux drum vol (m³)</td><td>${data.Vdrum?num(data.Vdrum,2):"—"}</td></tr>
      </table>
    </div>
  </div>

  <div class="box">
    <h2>Codes & Standards</h2>
    <div class="muted">ASME Sec VIII Div.1, ASME B31.3, TEMA, API 520/521, ISA 5.1, IEC 60079 / NEC, NACE MR0175/ISO 15156, ASME BPE (pharma).</div>
  </div>
  </div>
</body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print(); // user chooses Save as PDF
    setTimeout(() => w.close(), 250);
  };

  return (
    <div className="datasheet-card" style={{ border: "1px solid #e4ecff", borderRadius: 12, padding: 12, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h4 style={{ margin: "0 0 8px" }}>Datasheet (print/PDF)</h4>
        <button className="export-btn" onClick={printPDF}>Print / Save as PDF</button>
      </div>
      <p style={{ margin: "0 0 6px", color: "#475569" }}>Generates a clean, printable sheet with a light watermark.</p>
    </div>
  );
}

