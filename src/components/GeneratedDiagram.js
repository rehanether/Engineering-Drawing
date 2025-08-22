// src/components/GeneratedDiagram.js
import React, { useMemo, useRef, useState, useCallback } from "react";

/* ---------------- download helpers ---------------- */
function downloadBlob(filename, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  requestAnimationFrame(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  });
}
function downloadSVG(svgEl, filename = "pfd.svg") {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const blob = new Blob([clone.outerHTML], { type: "image/svg+xml" });
  downloadBlob(filename, blob);
}
async function downloadPNG(svgEl, filename = "pfd.png") {
  const clone = svgEl.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const blob = new Blob([clone.outerHTML], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  const vb = svgEl.viewBox.baseVal;
  const w = vb?.width || 1200;
  const h = vb?.height || 650;
  await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = url; });
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  canvas.toBlob((png) => { if (png) downloadBlob(filename, png); URL.revokeObjectURL(url); }, "image/png");
}

/* ---------------- style tokens ---------------- */
const COLOR = {
  feed: "#16a34a",        // green
  vapor: "#dc2626",       // red
  cond: "#2563eb",        // blue
  prod: "#334155",        // slate
  unitStroke: "#94a3b8",
  unitFillTop: "#ffffff",
  unitFillBottom: "#f8fafc",
  text: "#0f172a",
  label: "#334155",
  card: "#ffffff",
  cardBorder: "#e5e7eb",
};
const LINE = 5;

/* orthogonal elbow path */
function elbowPath(x1, y1, x2, y2) {
  const midX = (x1 + x2) / 2;
  return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
}
function vPath(x1, y1, x2, y2) { return `M ${x1} ${y1} L ${x2} ${y2}`; }

/* ---------------- diagram ---------------- */
function Diagram({ results }) {
  const {
    feedFlow = "", productFlow = "", vaporFlow = "", condensate = ""
  } = results || {};

  const W = 1200, H = 650; // base canvas
  const svgRef = useRef(null);

  /* Zoom & Pan */
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    const newScale = Math.min(2.5, Math.max(0.6, scale * delta));
    const dx = mx - pan.x;
    const dy = my - pan.y;
    const k = newScale / scale - 1;
    setPan({ x: pan.x - dx * k, y: pan.y - dy * k });
    setScale(newScale);
  }, [scale, pan]);

  const onMouseDown = (e) => setDrag({ x: e.clientX, y: e.clientY, panStart: { ...pan } });
  const onMouseMove = (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    setPan({ x: drag.panStart.x + dx, y: drag.panStart.y + dy });
  };
  const onMouseUp = () => setDrag(null);
  const zoomIn = () => setScale(s => Math.min(2.5, s * 1.1));
  const zoomOut = () => setScale(s => Math.max(0.6, s / 1.1));
  const zoomReset = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  /* layout */
  const pos = useMemo(() => ({
    feed: { x: 70,  y: 250, w: 160, h: 84, title: "Feed Tank", tag: "T-101" },
    hx:   { x: 270, y: 250, w: 200, h: 84, title: "Preheater (HX)", tag: "E-101" },
    evap: { x: 520, y: 200, w: 260, h: 180, title: "MVR Evaporator", tag: "V-101" },
    sep:  { x: 850, y: 260, w: 130, h: 84, title: "Vapor Separator", tag: "S-101" },
    comp: { x: 930, y: 90,  w: 200, h: 84, title: "MVR Compressor", tag: "C-101" },
    cond: { x: 850, y: 400, w: 180, h: 100, title: "Condensate Tank", tag: "TK-202" },
    prod: { x: 520, y: 410, w: 260, h: 30,  title: "Product (Concentrated Waste)" },
    vHX:  { x: 520 + 260 - 140, y: 200 + 26, w: 120, h: 54 }
  }), []);

  /* streams */
  const streams = useMemo(() => ([
    // Feed: Tank -> Preheater
    {
      color: COLOR.feed, marker: "url(#arrow-green)",
      path: elbowPath(pos.feed.x + pos.feed.w, pos.feed.y + pos.feed.h/2, pos.hx.x, pos.hx.y + pos.hx.h/2),
      label: feedFlow ? `Feed ${feedFlow} kg/h` : "Feed", lx: (pos.feed.x + pos.hx.x)/2, ly: pos.feed.y - 10
    },
    // Feed: Preheater -> Evaporator
    {
      color: COLOR.feed, marker: "url(#arrow-green)",
      path: elbowPath(pos.hx.x + pos.hx.w, pos.hx.y + pos.hx.h/2, pos.evap.x, pos.evap.y + pos.evap.h*0.65),
      label: "Preheated feed", lx: pos.hx.x + pos.hx.w + 40, ly: pos.hx.y + pos.hx.h/2 - 12
    },
    // Vapor suction: Evaporator TOP -> Compressor suction
    {
      color: COLOR.vapor, marker: "url(#arrow-red)",
      path: elbowPath(pos.evap.x + pos.evap.w/2, pos.evap.y + 24, pos.comp.x + pos.comp.w/2, pos.comp.y + pos.comp.h),
      label: vaporFlow ? `Vapor ${vaporFlow} kg/h` : "Vapor to compressor",
      lx: pos.comp.x - 40, ly: pos.evap.y + 12
    },
    // Compressor discharge -> internal Vapor HX
    {
      color: COLOR.vapor, marker: "url(#arrow-red)",
      path: elbowPath(pos.comp.x + pos.comp.w, pos.comp.y + pos.comp.h/2, pos.vHX.x + pos.vHX.w - 6, pos.vHX.y + 26),
      label: "Compressed vapor to Vapor HX", lx: pos.comp.x + pos.comp.w - 40, ly: pos.comp.y - 10
    },
    // Condensate -> Condensate tank
    {
      color: COLOR.cond, marker: "url(#arrow-blue)",
      path: elbowPath(pos.evap.x + 18, pos.evap.y + pos.evap.h - 24, pos.cond.x + pos.cond.w/2, pos.cond.y),
      label: condensate ? `Condensate ${condensate} kg/h` : "Condensate", lx: pos.cond.x + 8, ly: pos.cond.y - 10
    },
    // Product
    {
      color: COLOR.prod, marker: "url(#arrow-dark)",
      path: vPath(pos.evap.x + pos.evap.w/2, pos.evap.y + pos.evap.h, pos.prod.x + pos.prod.w/2, pos.prod.y),
      label: productFlow ? `Product ${productFlow} kg/h` : "Product", lx: pos.evap.x + pos.evap.w/2 + 10, ly: pos.prod.y - 10
    }
  ]), [pos, feedFlow, productFlow, vaporFlow, condensate]);

  return (
    <div className="ed-card" style={{ background: COLOR.card, border: `1px solid ${COLOR.cardBorder}`, borderRadius: 14, padding: 16 }}>
      {/* Toolbar */}
      <div className="ed-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 18, color: COLOR.text }}>Auto-generated MVR PFD</span>
          <span style={{ fontSize: 12, color: "#64748b", background: "#f1f5f9", padding: "2px 8px", borderRadius: 999 }}>
            Basic Engineering Package – PFD
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ed-btn" onClick={zoomOut}>−</button>
          <button className="ed-btn" onClick={zoomIn}>＋</button>
          <button className="ed-btn" onClick={zoomReset}>Reset</button>
          <button className="ed-btn" onClick={() => downloadSVG(svgRef.current)}>SVG</button>
          <button className="ed-btn" onClick={() => downloadPNG(svgRef.current)}>PNG</button>
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{
          border: `1px solid ${COLOR.cardBorder}`,
          borderRadius: 12,
          overflow: "hidden",
          background: "#fff"
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          onWheel={onWheel}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          style={{ cursor: drag ? "grabbing" : "grab" }}
        >
          <defs>
            <marker id="arrow-green" markerWidth="12" markerHeight="12" refX="10" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,7 L10,3.5 z" fill={COLOR.feed} />
            </marker>
            <marker id="arrow-red" markerWidth="12" markerHeight="12" refX="10" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,7 L10,3.5 z" fill={COLOR.vapor} />
            </marker>
            <marker id="arrow-blue" markerWidth="12" markerHeight="12" refX="10" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,7 L10,3.5 z" fill={COLOR.cond} />
            </marker>
            <marker id="arrow-dark" markerWidth="12" markerHeight="12" refX="10" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,7 L10,3.5 z" fill={COLOR.prod} />
            </marker>
            <linearGradient id="unit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLOR.unitFillTop} />
              <stop offset="100%" stopColor={COLOR.unitFillBottom} />
            </linearGradient>
          </defs>

          {/* Zoom/Pan container */}
          <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
            {/* Units */}
            {[pos.feed, pos.hx, pos.evap, pos.sep, pos.comp, pos.cond].map((u, i) => (
              <g key={i}>
                <rect x={u.x} y={u.y} width={u.w} height={u.h} rx="10" fill="url(#unit)" stroke={COLOR.unitStroke} />
                <text x={u.x + u.w / 2} y={u.y + 22} textAnchor="middle" fontSize="14" fontWeight="700" fill={COLOR.text}>
                  {u.title}
                </text>
                <text x={u.x + u.w / 2} y={u.y + u.h - 8} textAnchor="middle" fontSize="12" fill="#64748b">{u.tag}</text>
              </g>
            ))}

            {/* Evaporator internals + Vapor HX */}
            <rect x={pos.evap.x + 18} y={pos.evap.y + 70} width={pos.evap.w - 36} height={pos.evap.h - 96} rx="8" fill="#fff" stroke="#cbd5e1"/>
            {/* liquid surface */}
            <path d={`M ${pos.evap.x + 28} ${pos.evap.y + 110} C ${pos.evap.x + 100} ${pos.evap.y + 92}, ${pos.evap.x + 180} ${pos.evap.y + 128}, ${pos.evap.x + pos.evap.w - 28} ${pos.evap.y + 106}`}
                  stroke="#0ea5e9" strokeWidth="2" fill="none"/>
            {/* internal vapor HX box */}
            <rect x={pos.vHX.x} y={pos.vHX.y} width={pos.vHX.w} height={pos.vHX.h} rx="6" fill="#fff" stroke="#cbd5e1"/>
            <text x={pos.vHX.x + pos.vHX.w/2} y={pos.vHX.y + pos.vHX.h/2 + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill={COLOR.text}>Vapor HX</text>

            {/* Compressor hint impeller */}
            <circle cx={pos.comp.x + pos.comp.w/2} cy={pos.comp.y + pos.comp.h/2} r="12" stroke="#64748b" fill="none"/>
            <line x1={pos.comp.x + pos.comp.w/2} y1={pos.comp.y + pos.comp.h/2 - 10} x2={pos.comp.x + pos.comp.w/2} y2={pos.comp.y + pos.comp.h/2 + 10} stroke="#64748b"/>

            {/* Streams */}
            {streams.map((s, i) => (
              <g key={i}>
                <path d={s.path} stroke={s.color} strokeWidth={LINE} fill="none" markerEnd={s.marker} />
                <text x={s.lx} y={s.ly} textAnchor="start" fontSize="13" fill={COLOR.label}>{s.label}</text>
              </g>
            ))}

            {/* Legend */}
            <g>
              <rect x={W - 260} y={H - 130} width={220} height={92} rx="10" fill="#f8fafc" stroke="#e2e8f0"/>
              <text x={W - 150} y={H - 110} textAnchor="middle" fontSize="13" fontWeight="700" fill={COLOR.text}>Legend</text>
              <g transform={`translate(${W - 245}, ${H - 95})`}>
                <line x1="0" y1="0" x2="26" y2="0" stroke={COLOR.feed} strokeWidth={LINE} />
                <text x="36" y="4" fontSize="12" fill={COLOR.label}>Feed</text>
                <line x1="0" y1="22" x2="26" y2="22" stroke={COLOR.vapor} strokeWidth={LINE} />
                <text x="36" y="26" fontSize="12" fill={COLOR.label}>Vapor</text>
                <line x1="0" y1="44" x2="26" y2="44" stroke={COLOR.cond} strokeWidth={LINE} />
                <text x="36" y="48" fontSize="12" fill={COLOR.label}>Condensate</text>
              </g>
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}

export default function GeneratedDiagram({ results }) {
  if (!results) return <p style={{ textAlign: "center" }}>🔍 No image generated yet.</p>;
  return <Diagram results={results} />;
}



