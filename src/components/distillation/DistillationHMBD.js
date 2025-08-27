import React from "react";

export default function DistillationHMBD({ data }) {
  const { F, D, B, R, Qc_kJph, Qr_kJph, Dcol, Nth, Nactual, internals } = data || {};
  const num = (v, d = 1) => (v || v === 0) ? Number(v).toFixed(d) : "—";

  return (
    <svg viewBox="0 0 900 320" width="100%" height="auto">
      {/* watermark (subtle, diagonal) */}
      <g opacity="0.06">
        <text x="450" y="170" fontSize="64" fontFamily="Inter, Arial, sans-serif"
              transform="rotate(-25 450 170)" textAnchor="middle" fill="#0F172A">
          engineeringdrawing.io
        </text>
      </g>

      {/* column */}
      <rect x="140" y="40" width="140" height="220" rx="12" fill="#ECEFF4" stroke="#0F172A" strokeWidth="4" />

      {/* trays / packing */}
      {internals === "trays" ? (
        [...Array(6)].map((_, i) => (
          <line key={i} x1="150" x2="270" y1={70 + i * 35} y2={70 + i * 35} stroke="#0F172A" strokeWidth="2" />
        ))
      ) : (
        <rect x="152" y="60" width="116" height="180" fill="none" stroke="#64748B" strokeDasharray="6,6" />
      )}

      {/* condenser & reflux drum */}
      <rect x="600" y="60" width="110" height="90" rx="10" fill="#fff" stroke="#0F172A" strokeWidth="3" />
      <rect x="470" y="70" width="90" height="60" rx="8" fill="#fff" stroke="#0F172A" strokeWidth="3" />

      {/* reboiler & base */}
      <rect x="140" y="270" width="140" height="20" fill="#0F172A" />
      <rect x="100" y="240" width="80" height="40" rx="8" fill="#fff" stroke="#0F172A" strokeWidth="3" />

      {/* lines */}
      <line x1="280" y1="70" x2="600" y2="70" stroke="#F59E0B" strokeWidth="6" />  {/* overhead vapor */}
      <line x1="655" y1="150" x2="655" y2="220" stroke="#3B82F6" strokeWidth="6" strokeDasharray="14,10" /> {/* reflux return */}
      <line x1="655" y1="220" x2="280" y2="220" stroke="#3B82F6" strokeWidth="6" strokeDasharray="14,10" />
      <line x1="100" y1="160" x2="140" y2="160" stroke="#10B981" strokeWidth="6" /> {/* feed */}
      <line x1="100" y1="260" x2="140" y2="260" stroke="#F59E0B" strokeWidth="6" /> {/* bottoms to reboiler */}

      {/* labels */}
      <text x="90" y="156" fontSize="12" fill="#0F172A">F = {num(F, 2)} kmol/h</text>
      <text x="430" y="90" fontSize="12" fill="#0F172A">Reflux drum</text>
      <text x="610" y="90" fontSize="12" fill="#0F172A">Condenser</text>
      <text x="282" y="62" fontSize="12" fill="#0F172A">V ↑</text>
      <text x="300" y="238" fontSize="12" fill="#0F172A">Reflux</text>
      <text x="70" y="254" fontSize="12" fill="#0F172A">Reboiler</text>

      {/* numbers */}
      <text x="310" y="58"  fontSize="12" fill="#0F172A">R = {num(R, 2)}</text>
      <text x="605" y="58"  fontSize="12" fill="#0F172A">Qc = {num(Qc_kJph, 0)} kJ/h</text>
      <text x="60"  y="290" fontSize="12" fill="#0F172A">Qr = {num(Qr_kJph, 0)} kJ/h</text>
      <text x="140" y="35"  fontSize="12" fill="#0F172A">ID ≈ {num(Dcol, 3)} m · N(th)={num(Nth, 1)}{Nactual ? ` · N(act)=${Nactual}` : ""}</text>

      {/* product tags now show flows so D & B are used */}
      <text x="720" y="75"  fontSize="12" fill="#0F172A">D = {num(D, 2)} kmol/h</text>
      <text x="90"  y="270" fontSize="12" fill="#0F172A">B = {num(B, 2)} kmol/h</text>
    </svg>
  );
}

