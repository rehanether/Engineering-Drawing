// src/components/PidDiagram.js
import React, { useRef, useState, useCallback } from "react";

/**
 * PidDiagram
 * - Shows a P&ID inside a styled card.
 * - If you have a PNG/SVG image of the P&ID, pass it via `pngSrc` for crisp zooming.
 * - If not, it will embed the PDF via <object>.
 */
export default function PidDiagram({
  title = "Piping & Instrumentation Diagram (P&ID)",
  pngSrc,             // e.g. "/assets/pid-101.png" (preferred for zoom/pan)
  pdfSrc = "/assets/P&IDs-101.pdf", // fallback if no PNG
}) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);
  const wrapRef = useRef(null);

  const onWheel = useCallback((e) => {
    if (!pngSrc) return; // zoom only for image mode
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    setScale((s) => Math.min(2.5, Math.max(0.6, s * delta)));
  }, [pngSrc]);

  const onMouseDown = (e) => {
    if (!pngSrc) return;
    setDrag({ x: e.clientX, y: e.clientY, panStart: { ...pan } });
  };
  const onMouseMove = (e) => {
    if (!pngSrc || !drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    setPan({ x: drag.panStart.x + dx, y: drag.panStart.y + dy });
  };
  const onMouseUp = () => setDrag(null);

  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  return (
    <div className="ed-card" style={{ padding: 16, borderRadius: 14 }}>
      {/* header / tools */}
      <div className="ed-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 18 }}> {title} </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a className="ed-btn" href={pdfSrc} target="_blank" rel="noreferrer">Open PDF</a>
          {pngSrc && (
            <>
              <button className="ed-btn" onClick={() => setScale(s => Math.max(0.6, s / 1.1))}>−</button>
              <button className="ed-btn" onClick={() => setScale(s => Math.min(2.5, s * 1.1))}>＋</button>
              <button className="ed-btn" onClick={resetView}>Reset</button>
            </>
          )}
        </div>
      </div>

      {/* canvas */}
      <div
        ref={wrapRef}
        className="pid-canvas"
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          width: "100%",
          minHeight: 520,
          overflow: "hidden",
          position: "relative",
          cursor: pngSrc ? (drag ? "grabbing" : "grab") : "default",
        }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {pngSrc ? (
          <img
            src={pngSrc}
            alt="P&ID"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: "center center",
              display: "block",
              maxWidth: "100%",
              userSelect: "none",
              pointerEvents: "none",
              margin: "0 auto",
            }}
            draggable={false}
          />
        ) : (
          <object
            data={pdfSrc}
            type="application/pdf"
            aria-label="P&ID PDF"
            style={{
              width: "100%",
              height: "78vh",
              border: "none",
              borderRadius: 12,
              background: "#fff",
            }}
          >
            <p style={{ padding: 16 }}>
              Your browser can’t display embedded PDFs.{" "}
              <a href={pdfSrc} target="_blank" rel="noreferrer">Click here to open the P&amp;ID PDF</a>.
            </p>
          </object>
        )}
      </div>
    </div>
  );
}



