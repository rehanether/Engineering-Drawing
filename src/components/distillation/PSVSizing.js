import React, { useMemo, useState } from "react";

/**
 * PSV sizing (API 520/521 stub)
 * Fire heat (API 521):  Q = 1160 * F * A_wet^0.82  [W]
 * Vapor (choked):       m/A = Kd*Kb*Kc * P1 * Ck * sqrt(k / (R_eff*T))
 * Liquid (non-viscous): m/A = Kd*Kc * sqrt(2 * ρ * ΔP)
 * Units: SI. Area in m² plus API letter suggestion.
 */
const RU = 8314.462618; // J/(kmol·K)
const API_ORIFICES = [
  ["D", 0.110], ["E", 0.196], ["F", 0.307], ["G", 0.503], ["H", 0.785],
  ["J", 1.288], ["K", 1.838], ["L", 2.853], ["M", 3.600], ["N", 4.340],
  ["P", 5.430], ["Q", 6.380], ["R", 7.430], ["T", 9.420]
]; // in²
const IN2_TO_M2 = 0.00064516;

export default function PSVSizing({ defaults }) {
  const [inp, setInp] = useState({
    // Fire case (API 521)
    Awet_m2: "20",          // wetted area (m²)
    Fenv: "1.0",            // 1.0 uninsulated; ~0.15 insulated; ~0.082 water spray
    lambda_kJkg: "350",     // latent at relieving (kJ/kg)

    // Relief basis
    caseType: "vapor",      // "vapor" | "liquid"
    MW: "80",               // kg/kmol (mixture)
    k: "1.30",              // Cp/Cv
    Z: "1.0",               // compressibility
    Trel_K: (defaults?.Trel_K ?? 400).toString(),
    setP_kPag: "600",
    overpress_pct: "21",
    backP_kPa_abs: "101",

    // Coefficients
    Kd: "0.975",
    Kb: "1.0",
    Kc: "1.0",

    // Liquid properties
    rhoL: "650"
  });

  const onChange = e => setInp(s => ({ ...s, [e.target.name]: e.target.value }));
  const num = (v, d = 3) => (v || v === 0) ? Number(v).toFixed(d) : "—";

  const out = useMemo(() => {
    const Awet = Math.max(0, +inp.Awet_m2 || 0);
    const Fenv = Math.max(0, +inp.Fenv || 0);
    const lambda = Math.max(1, +inp.lambda_kJkg || 1); // kJ/kg

    // API 521 fire heat input (W)
    const Q_W = 1160 * Fenv * Math.pow(Awet, 0.82);

    // Required relief mass rate (kg/s)
    const mreq_kg_s = Q_W / (lambda * 1000); // W / (J/kg)

    // Pressures
    const setP_kPag = +inp.setP_kPag || 0;
    const P1_kPa = (setP_kPag + 101) * (1 + (+inp.overpress_pct || 0) / 100); // abs kPa
    const P1_Pa = Math.max(1, P1_kPa * 1000);
    const Pb_kPa = Math.max(0, +inp.backP_kPa_abs || 0);
    const dP_Pa = Math.max(1, (P1_kPa - Pb_kPa) * 1000); // for liquid case

    // Coeffs
    const Kd = Math.max(0.1, +inp.Kd || 0.975);
    const Kb = Math.max(0.1, +inp.Kb || 1.0);
    const Kc = Math.max(0.1, +inp.Kc || 1.0);

    let A_m2 = null;

    if (inp.caseType === "vapor") {
      const MW = Math.max(1, +inp.MW || 1);
      const k = Math.max(1.01, +inp.k || 1.3);
      const Z = Math.max(0.2, +inp.Z || 1);
      const T = Math.max(1, +inp.Trel_K || 300);
      const Rs = RU / MW;                     // J/(kg·K)
      const Reff = Rs / Z;                    // include Z
      const Ck = Math.sqrt(k) * Math.pow(2 / (k + 1), (k + 1) / (2 * (k - 1))); // critical factor
      const G = Kd * Kb * Kc * P1_Pa * Ck * Math.sqrt(k / (Reff * T));          // kg/(m²·s)
      A_m2 = mreq_kg_s / Math.max(G, 1e-12);
    } else {
      // Liquid, non-viscous
      const rhoL = Math.max(1, +inp.rhoL || 650);
      const G = Kd * Kc * Math.sqrt(2 * rhoL * dP_Pa); // kg/(m²·s)
      A_m2 = mreq_kg_s / Math.max(G, 1e-12);
    }

    // API letter suggestion (next larger)
    const A_in2 = A_m2 / IN2_TO_M2;
    let suggest = API_ORIFICES[API_ORIFICES.length - 1][0];
    for (const [letr, ain2] of API_ORIFICES) {
      if (A_in2 <= ain2) { suggest = letr; break; }
    }

    return { Q_W, mreq_kg_s, P1_kPa, A_m2, A_in2, suggest };
  }, [inp]);

  return (
    <div className="psv-card" style={{ border: "1px solid #e4ecff", borderRadius: 12, padding: 12, background: "#fff" }}>
      <h4 style={{ margin: "0 0 8px" }}>PSV Sizing (API 520/521 — stub)</h4>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div>
          <b>Fire Case</b>
          <label style={{ display: "grid", gap: 6, marginTop: 6 }}>
            Wetted area (m²)
            <input name="Awet_m2" value={inp.Awet_m2} onChange={onChange} type="number" step="0.1" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            Env. factor F
            <input name="Fenv" value={inp.Fenv} onChange={onChange} type="number" step="0.01" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            Latent λ (kJ/kg)
            <input name="lambda_kJkg" value={inp.lambda_kJkg} onChange={onChange} type="number" />
          </label>
        </div>

        <div>
          <b>Relief Basis</b>
          <label style={{ display: "grid", gap: 6, marginTop: 6 }}>
            Case
            <select name="caseType" value={inp.caseType} onChange={onChange}>
              <option value="vapor">Vapor (choked)</option>
              <option value="liquid">Liquid (non-viscous)</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            Set P (kPag)
            <input name="setP_kPag" value={inp.setP_kPag} onChange={onChange} type="number" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            Overpressure (%)
            <input name="overpress_pct" value={inp.overpress_pct} onChange={onChange} type="number" step="1" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            Back P (kPa abs)
            <input name="backP_kPa_abs" value={inp.backP_kPa_abs} onChange={onChange} type="number" />
          </label>
        </div>

        <div>
          <b>Vapor Props</b>
          <label style={{ display: "grid", gap: 6, marginTop: 6 }}>
            MW (kg/kmol)
            <input name="MW" value={inp.MW} onChange={onChange} type="number" step="0.1" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            k = Cp/Cv
            <input name="k" value={inp.k} onChange={onChange} type="number" step="0.01" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            Z
            <input name="Z" value={inp.Z} onChange={onChange} type="number" step="0.01" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            T (K)
            <input name="Trel_K" value={inp.Trel_K} onChange={onChange} type="number" />
          </label>
        </div>

        <div>
          <b>Coefficients</b>
          <label style={{ display: "grid", gap: 6, marginTop: 6 }}>
            Kd
            <input name="Kd" value={inp.Kd} onChange={onChange} type="number" step="0.001" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            Kb
            <input name="Kb" value={inp.Kb} onChange={onChange} type="number" step="0.01" />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            Kc
            <input name="Kc" value={inp.Kc} onChange={onChange} type="number" step="0.01" />
          </label>

          {inp.caseType === "liquid" && (
            <label style={{ display: "grid", gap: 6, marginTop: 6 }}>
              ρ<sub>L</sub> (kg/m³)
              <input name="rhoL" value={inp.rhoL} onChange={onChange} type="number" step="1" />
            </label>
          )}
        </div>
      </div>

      <div style={{ marginTop: 10, background: "#f9fbff", border: "1px solid #e8f0ff", borderRadius: 10, padding: 10 }}>
        <b>Results</b>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 6 }}>
          <div>Fire heat Q: <b>{num(out.Q_W, 0)}</b> W</div>
          <div>Relief mass rate: <b>{num(out.mreq_kg_s * 3600, 0)}</b> kg/h</div>
          <div>Relieving P<sub>1</sub>: <b>{num(out.P1_kPa, 0)}</b> kPa abs</div>
          <div>Required area: <b>{num(out.A_m2, 6)}</b> m²</div>
          <div>…in²: <b>{num(out.A_in2, 3)}</b></div>
          <div>API orifice (suggest): <b>{out.suggest}</b></div>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: "#475569" }}>
          Preliminary sizing per API 520/521 assumptions (ideal/choked vapor; non-viscous liquid).
          Confirm with vendor software for final selection, viscosity/backpressure limits, built-up & stability.
        </div>
      </div>
    </div>
  );
}

