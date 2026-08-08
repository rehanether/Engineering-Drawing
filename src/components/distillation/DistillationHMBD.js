import React from "react";

const num = (value, digits = 1) => (value || value === 0) ? Number(value).toFixed(digits) : "—";

export default function DistillationHMBD({ data }) {
  const { F, D, B, R, Vkmolph, Qc_kJph, Qr_kJph, Dcol, Hcol, Nactual, internals, zF, xD, xB, Ttop } = data || {};
  const unit = { fill: "#fff", stroke: "#64748b", strokeWidth: 2 };
  const tag = { fill: "#182338", fontSize: 13, fontWeight: 800, textAnchor: "middle" };
  const note = { fill: "#647087", fontSize: 10, textAnchor: "middle" };

  return (
    <svg viewBox="0 0 1120 620" role="img" aria-label="Industrial distillation process flow diagram with live heat and mass balance">
      <defs>
        {[['feed','#1f9d73'],['vapor','#e4654e'],['liquid','#348bd6'],['bottoms','#7c4de8'],['utility','#e49a26']].map(([id,color])=><marker key={id} id={`ds-${id}`} markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto"><path d="M0,0 L10,4 L0,8z" fill={color}/></marker>)}
      </defs>
      <rect width="1120" height="620" fill="#f8fafc"/>
      <text x="34" y="34" fill="#182338" fontSize="16" fontWeight="900">ENGINEERING DRAWING · INDUSTRIAL DISTILLATION PFD</text>
      <text x="1085" y="34" fill="#647087" fontSize="10" textAnchor="end">LIVE PRELIMINARY DESIGN · NOT FOR CONSTRUCTION</text>

      <rect x="30" y="255" width="125" height="105" rx="12" {...unit}/><text x="92" y="298" style={tag}>TK-101</text><text x="92" y="320" style={note}>Feed tank</text><text x="92" y="340" style={note}>{num(F,2)} kmol/h</text>
      <circle cx="205" cy="307" r="22" fill="#ffd98d" stroke="#a56a00" strokeWidth="2"/><path d="M197 297 L218 307 L197 317z" fill="#25344a"/><text x="205" y="345" style={note}>P-101 A/B</text>
      <rect x="255" y="267" width="130" height="80" rx="10" {...unit}/><path d="M272 330 L368 282 M272 282 L368 330" stroke="#9aa8b8" strokeWidth="3"/><text x="320" y="296" style={tag}>E-101</text><text x="320" y="318" style={note}>Feed preheater</text>

      <rect x="455" y="92" width="185" height="385" rx="72" fill="#eef2f6" stroke="#64748b" strokeWidth="3"/>
      {internals==="trays"?[0,1,2,3,4,5,6,7,8].map(index=><line key={index} x1="477" x2="618" y1={135+index*36} y2={135+index*36} stroke="#748296" strokeWidth="2"/>):<g><rect x="477" y="125" width="141" height="320" fill="none" stroke="#748296" strokeDasharray="7 5"/><path d="M477 125 L618 445 M618 125 L477 445" stroke="#b0bac6" strokeWidth="1"/></g>}
      <text x="547" y="260" style={tag}>C-101</text><text x="547" y="283" style={note}>Distillation column</text><text x="547" y="303" style={note}>ID {num(Dcol,2)} m · H {num(Hcol,1)} m</text><text x="547" y="323" style={note}>{Nactual||'—'} {internals==="trays"?'actual trays':'equivalent stages'}</text>

      <rect x="735" y="62" width="155" height="78" rx="10" {...unit}/><path d="M752 120 L873 82 M752 82 L873 120" stroke="#9aa8b8" strokeWidth="3"/><text x="812" y="92" style={tag}>E-102</text><text x="812" y="113" style={note}>Overhead condenser</text>
      <rect x="945" y="75" width="130" height="85" rx="42" {...unit}/><text x="1010" y="110" style={tag}>V-101</text><text x="1010" y="132" style={note}>Reflux drum</text>
      <circle cx="845" cy="210" r="21" fill="#ffd98d" stroke="#a56a00" strokeWidth="2"/><path d="M837 200 L858 210 L837 220z" fill="#25344a"/><text x="845" y="246" style={note}>P-102 A/B reflux</text>
      <rect x="950" y="245" width="125" height="105" rx="12" {...unit}/><text x="1012" y="286" style={tag}>TK-102</text><text x="1012" y="308" style={note}>Distillate</text><text x="1012" y="329" style={note}>{num(D,2)} kmol/h</text>

      <rect x="690" y="430" width="150" height="82" rx="10" {...unit}/><path d="M708 491 L822 450 M708 450 L822 491" stroke="#9aa8b8" strokeWidth="3"/><text x="765" y="460" style={tag}>E-103</text><text x="765" y="482" style={note}>Kettle reboiler</text>
      <circle cx="875" cy="545" r="21" fill="#ffd98d" stroke="#a56a00" strokeWidth="2"/><path d="M867 535 L888 545 L867 555z" fill="#25344a"/><text x="875" y="580" style={note}>P-103 A/B</text>
      <rect x="950" y="500" width="125" height="92" rx="12" {...unit}/><text x="1012" y="535" style={tag}>TK-103</text><text x="1012" y="557" style={note}>Bottoms product</text><text x="1012" y="577" style={note}>{num(B,2)} kmol/h</text>

      <path d="M155 307 H183 M227 307 H255 M385 307 H455" fill="none" stroke="#1f9d73" strokeWidth="5" markerEnd="url(#ds-feed)"/>
      <text x="300" y="250" fill="#187c61" fontSize="10" textAnchor="middle">S-01 · F {num(F,2)} kmol/h · zLK {num(zF,3)}</text>
      <path d="M547 92 V55 H735" fill="none" stroke="#e4654e" strokeWidth="6" markerEnd="url(#ds-vapor)"/><text x="655" y="49" fill="#9d3e30" fontSize="10" textAnchor="middle">S-02 · V {num(Vkmolph,2)} kmol/h · {num(Ttop,1)}°C</text>
      <path d="M890 101 H945" fill="none" stroke="#348bd6" strokeWidth="5" markerEnd="url(#ds-liquid)"/>
      <path d="M1010 160 V210 H866" fill="none" stroke="#348bd6" strokeWidth="5" markerEnd="url(#ds-liquid)"/><path d="M824 210 H670 V160 H640" fill="none" stroke="#348bd6" strokeWidth="5" markerEnd="url(#ds-liquid)"/><text x="735" y="200" fill="#286ca8" fontSize="10" textAnchor="middle">Reflux · R {num(R,2)}</text>
      <path d="M1010 160 V245" fill="none" stroke="#348bd6" strokeWidth="5" markerEnd="url(#ds-liquid)"/><text x="1030" y="205" fill="#286ca8" fontSize="10">S-03 · xLK {num(xD,3)}</text>
      <path d="M547 477 V545 H854" fill="none" stroke="#7c4de8" strokeWidth="5" markerEnd="url(#ds-bottoms)"/><path d="M896 545 H950" fill="none" stroke="#7c4de8" strokeWidth="5" markerEnd="url(#ds-bottoms)"/><text x="700" y="568" fill="#6040b8" fontSize="10" textAnchor="middle">S-05 · xLK {num(xB,3)}</text>
      <path d="M640 430 H690" fill="none" stroke="#e49a26" strokeWidth="5" markerEnd="url(#ds-utility)"/><path d="M690 490 H655 V390 H640" fill="none" stroke="#e49a26" strokeWidth="5" markerEnd="url(#ds-utility)"/>

      <rect x="30" y="410" width="335" height="125" rx="10" fill="#fff" stroke="#d7dde7"/>
      <text x="48" y="435" fill="#6847f5" fontSize="10" fontWeight="900">LIVE DUTY & PRODUCT SUMMARY</text>
      <text x="48" y="458" fill="#39455b" fontSize="11">Condenser: {num((Qc_kJph||0)/3600,1)} kW</text><text x="48" y="480" fill="#39455b" fontSize="11">Reboiler: {num((Qr_kJph||0)/3600,1)} kW</text>
      <text x="48" y="502" fill="#39455b" fontSize="11">Distillate: {num(D,2)} kmol/h</text><text x="200" y="502" fill="#39455b" fontSize="11">Bottoms: {num(B,2)} kmol/h</text>
      <text x="48" y="524" fill="#187c61" fontSize="11" fontWeight="800">Balance closure: {num((F||0)-(D||0)-(B||0),4)} kmol/h</text>

      <rect x="25" y="602" width="1070" height="1" fill="#7d8898"/><text x="30" y="615" fill="#647087" fontSize="8">Document ED-DS-PFD-001 · Rev P01 · Preliminary basic engineering · Values update from simulator inputs</text>
    </svg>
  );
}
