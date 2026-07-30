import React from "react";
export default function HeaterNode({ data }) {
  return (
    <div style={{ padding: 10, border: "1px solid #334155", borderRadius: 8, background: "#fff" }}>
      <b>Heater/Cooler</b>
      <div style={{ fontSize: 12, color: "#334155" }}>
        Target T: {data.Tset ?? "—"} K
      </div>
    </div>
  );
}
