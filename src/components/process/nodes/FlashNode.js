import React from "react";
export default function FlashNode({ data }) {
  return (
    <div style={{ padding: 10, border: "1px solid #334155", borderRadius: 8, background: "#fff" }}>
      <b>Flash Drum</b>
      <div style={{ fontSize: 12, color: "#334155" }}>
        T: {data.T?.toFixed?.(1) ?? "—"} K • P: {data.P ?? "—"} kPa
      </div>
    </div>
  );
}
