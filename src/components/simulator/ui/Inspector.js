// …existing imports…
import React from "react";
import { useSim } from "../state/SimContext";
import { COMPONENTS } from "../simCore/thermo";
import { validateFlowsheet } from "../simCore/engine";
import "../Validation.css";

function Num({ label, value, onChange, step = "any" }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: "#334155" }}>{label}</span>
      <input
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(+e.target.value)}
        style={{ padding: 6, border: "1px solid #cbd5e1", borderRadius: 6 }}
      />
    </label>
  );
}
function Pick({ label, value, onChange, options }) {
  return (
    <label style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 12, color: "#334155" }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ padding: 6, border: "1px solid #cbd5e1", borderRadius: 6 }}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

export default function Inspector() {
  const { state, dispatch } = useSim();
  const sel = state.nodes.find((n) => n.id === state.selection) || state.nodes[0];
  if (!sel) return <div className="edg-card">No unit selected</div>;
  const s = sel.spec || {};
  const change = (obj) => dispatch({ type: "SET_NODE_SPEC", id: sel.id, spec: obj });
  const m = state.results.meta[sel?.id] || {};
  const validation=validateFlowsheet(state),issues=[...validation.errors,...validation.warnings];

  const sumMeta = (key) =>
    Object.values(state.results.meta || {}).reduce((t, x) => t + (x?.[key] || 0), 0);

  return (
    <div className="edg-card" style={{ display: "grid", gridTemplateRows: "auto 1fr", minWidth: 300 }}>
      <div style={{ padding: 12, borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>{state.projectName || "Untitled Simulation"}</h3>
          <select
            value={state.propPack}
            onChange={(e) => dispatch({ type: "SET_PROP", pack: e.target.value })}
            className="edg-method-select"
          >
            <option>Raoult</option>
            <option>Peng–Robinson</option>
          </select>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>
            Heater duty: {sumMeta("duty_kW").toFixed(3)} kW • Pump power:{" "}
            {sumMeta("shaft_kW").toFixed(3)} kW
          </span>
        </div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Selected block · {sel?.name} ({sel?.type})
        </div>
      </div>

      <div style={{ padding: 12, overflowY: "auto" }}>
        <div className={`edg-validation ${validation.errors.length?"error":issues.length?"warning":"ok"}`}><b>{validation.errors.length?`${validation.errors.length} blocking specification error${validation.errors.length===1?"":"s"}`:issues.length?`${issues.length} flowsheet warning${issues.length===1?"":"s"}`:"Flowsheet specification complete"}</b><span>{issues[0]||"All blocks are connected and have usable specifications."}</span></div>
        {sel.type === "FEED" && (
          <>
            <Num label="Flow (mol/h)" value={s.F} onChange={(v) => change({ F: v })} />
            <Num label="Temp (K)" value={s.T} onChange={(v) => change({ T: v })} />
            <Num label="Press (kPa)" value={s.P} onChange={(v) => change({ P: v })} />
            <Num label="z(LK)" value={s.z} onChange={(v) => change({ z: v })} step="0.01" />
          </>
        )}

        {sel.type === "MIXER" && (
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Mixes all connected feeds on mass/energy basis (simplified).
          </div>
        )}

        {sel.type === "SPLITTER" && (
          <>
            <Num label="Split to outlet 1 (0–1)" value={s.frac ?? 0.5} onChange={(v) => change({ frac: v })} step="0.01" />
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Outlet-1 gets frac·F; Outlet-2 gets (1−frac)·F.
            </div>
          </>
        )}

        {(sel.type === "HEATER" || sel.type === "COOLER") && (
          <>
            <Num label="Target T (K)" value={s.Tset} onChange={(v) => change({ Tset: v })} />
            {m.duty_kW != null && (
              <div style={{ fontSize: 12, color: "#0f766e" }}>Duty: {m.duty_kW.toFixed(3)} kW</div>
            )}
          </>
        )}

        {sel.type === "VALVE" && (
          <>
            <Num label="Outlet P (kPa)" value={s.Pout ?? 101} onChange={(v) => change({ Pout: v })} />
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Throttling (no JT yet): T unchanged, P → Pout.
            </div>
          </>
        )}

        {sel.type === "HX" && (
          <>
            <Num label="UA (kW/K)" value={s.UA ?? 50} onChange={(v) => change({ UA: v })} />
            <Num label="Effectiveness (0–1)" value={s.eff ?? 0.7} onChange={(v) => change({ eff: v })} step="0.01" />
            <Num label="ΔT (K) approx" value={s.dT ?? 20} onChange={(v) => change({ dT: v })} />
            {m.Q_kW != null && (
              <div style={{ fontSize: 12, color: "#0f766e" }}>Q: {m.Q_kW.toFixed(3)} kW</div>
            )}
          </>
        )}

        {sel.type === "PUMP" && (
          <>
            <Num label="ΔP (kPa)" value={s.dP} onChange={(v) => change({ dP: v })} />
            <Num label="η (–)" value={s.eta ?? 0.7} onChange={(v) => change({ eta: v })} step="0.01" />
            {m.shaft_kW != null && (
              <div style={{ fontSize: 12, color: "#0f766e" }}>
                Shaft Power: {m.shaft_kW.toFixed(3)} kW
              </div>
            )}
          </>
        )}

        {sel.type === "COMPRESSOR" && (
          <><Num label="Outlet P (kPa)" value={s.Pout ?? 500} onChange={(v)=>change({Pout:v})}/><Num label="Isentropic efficiency" value={s.eta ?? .75} onChange={(v)=>change({eta:v})} step="0.01"/>{m.shaft_kW!=null&&<div className="edg-result-callout">Power: {m.shaft_kW.toFixed(3)} kW</div>}</>
        )}

        {sel.type === "SEP" && (
          <><Num label="Light-key recovery" value={s.recovery ?? .95} onChange={(v)=>change({recovery:v})} step="0.01"/><div className="edg-help-note">Connect two outlets: recovered light key and heavy-key remainder.</div></>
        )}

        {sel.type === "CSTR" && (
          <><Num label="Specified conversion" value={s.conversion ?? .7} onChange={(v)=>change({conversion:v})} step="0.01"/><Num label="Reactor temperature (K)" value={s.Tset ?? 350} onChange={(v)=>change({Tset:v})}/>{m.conversion!=null&&<div className="edg-result-callout">Conversion: {(m.conversion*100).toFixed(1)}%</div>}</>
        )}

        {sel.type === "FLASH" && (
          <>
            <Pick
              label="Light Key"
              value={s.comp1 || "Benzene"}
              onChange={(v) => change({ comp1: v })}
              options={COMPONENTS}
            />
            <Pick
              label="Heavy Key"
              value={s.comp2 || "Toluene"}
              onChange={(v) => change({ comp2: v })}
              options={COMPONENTS}
            />
            <Num label="T (K)" value={s.T ?? 340} onChange={(v) => change({ T: v })} />
            <Num label="P (kPa)" value={s.P ?? 101} onChange={(v) => change({ P: v })} />
            <div style={{ marginTop: 6, fontSize: 12, color: "#0f766e" }}>
              {m.Vfrac != null && <>Vapor fraction: {(m.Vfrac * 100).toFixed(1)}%</>}
              <br />
              {m.xLK != null && <>x(LK): {m.xLK.toFixed(4)} • y(LK): {m.yLK.toFixed(4)}</>}
              <br />
              {m.K_LK != null && <>K(LK): {m.K_LK.toFixed(3)} • K(HK): {m.K_HK.toFixed(3)}</>}
            </div>
          </>
        )}

        {sel.type === "RECYCLE" && (
          <>
            <Num label="Guess F (mol/h)" value={s.F0 ?? 1} onChange={(v) => change({ F0: v })} />
            <Num label="Guess T (K)" value={s.T0 ?? 320} onChange={(v) => change({ T0: v })} />
            <Num label="Guess P (kPa)" value={s.P0 ?? 101} onChange={(v) => change({ P0: v })} />
            <Num label="Guess z(LK)" value={s.z0 ?? 0.5} onChange={(v) => change({ z0: v })} step="0.01" />
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Connect recycle return → RECYCLE (in), and RECYCLE (out) → upstream node.
            </div>
          </>
        )}

        <h4 style={{ marginTop: 16 }}>Stream Table</h4>
        <table className="edg-table">
          <thead>
            <tr><th>Stream</th><th>F</th><th>T</th><th>P</th><th>Phase</th><th>z(LK)</th></tr>
          </thead>
          <tbody>
            {Object.entries(state.results.streams)
              .slice(0, 150)
              .map(([k, st]) => (
                <tr key={k}>
                  <td>{st.name || k}</td>
                  <td>{st.F?.toFixed?.(3)}</td>
                  <td>{st.T?.toFixed?.(2)}</td>
                  <td>{st.P?.toFixed?.(0)}</td>
                  <td>{st.phase}</td>
                  <td>{(st.z ?? 0).toFixed(3)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

