import React from "react";
export default function MixerNode({ data }) {
  return (
    <div style={{ padding: 10, border: "1px solid #334155", borderRadius: 8, background: "#fff" }}>
      <b>Mixer</b>
      <div style={{ fontSize: 12, color: "#334155" }}>Feeds: {data.feedCount ?? 2}</div>
    </div>
  );
}

