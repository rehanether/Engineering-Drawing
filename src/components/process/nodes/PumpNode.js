import React from "react";
export default function PumpNode({ data }) {
  return (
    <div style={{ padding: 10, border: "1px solid #334155", borderRadius: 8, background: "#fff" }}>
      <b>Pump</b>
      <div style={{ fontSize: 12, color: "#334155" }}>
        ΔP: {data.dP ?? "—"} kPa
      </div>
    </div>
  );
}
