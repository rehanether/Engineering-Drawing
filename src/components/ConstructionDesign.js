import React, { useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, isAddress, parseUnits } from "ethers";
import ConstructionModel3D from "./ConstructionModel3D";
import "./ConstructionDesign.css";

const EDG_CHAIN = process.env.REACT_APP_EDG_CHAIN_ID_HEX || "0x38";
const RECEIVER = process.env.REACT_APP_BNB_TESTNET_RECEIVER;
const EDG_TOKEN = process.env.REACT_APP_EDG_TESTNET_TOKEN;
const EDG_PRICE = process.env.REACT_APP_EDG_DOWNLOAD_PRICE || "100";
const EDG_DECIMALS = Number(process.env.REACT_APP_EDG_TOKEN_DECIMALS || 18);
const UPI_ID = process.env.REACT_APP_UPI_ID;
const UPI_NAME = process.env.REACT_APP_UPI_NAME || "Engineering Drawing";
const UPI_PRICE = process.env.REACT_APP_UPI_DOWNLOAD_PRICE || "999";
const UPI_TEST_MODE = process.env.REACT_APP_UPI_TEST_MODE === "true";
const UPI_ENABLED = process.env.REACT_APP_ENABLE_UPI === "true";
const EDG_ABI = ["function transfer(address to, uint256 value) returns (bool)"];
const BRAND_EMAIL = "contact@engineeringdrawing.io";
const BRAND_SITE = "https://engineeringdrawing.io";
const configuredApiBase = process.env.REACT_APP_API_BASE_URL || "";
const API_BASE = /^https?:\/\//.test(configuredApiBase) && !configuredApiBase.includes("localhost")
  ? configuredApiBase.replace(/\/$/, "")
  : "";
const configuredConstructionPrice = process.env.REACT_APP_CONSTRUCTION_PRICE_USD || "";
const CONSTRUCTION_PRICE_USD = /^\d+(?:\.\d{1,2})?$/.test(configuredConstructionPrice)
  ? configuredConstructionPrice
  : "10";
const COST_USD_INR = Number(process.env.REACT_APP_COST_USD_INR || 84);
const BNB_CONFIGURED = Boolean(RECEIVER && isAddress(RECEIVER));
const EDG_CONFIGURED = Boolean(EDG_TOKEN && isAddress(EDG_TOKEN));

const crcTable = (() => {
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeZip(files) {
  const encoder = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;
  const u16 = (value) => new Uint8Array([value & 255, (value >>> 8) & 255]);
  const u32 = (value) => new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]);
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const crc = crc32(data);
    const local = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...name,
    ]);
    parts.push(local, data);
    central.push(new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0), ...u16(0),
      ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name,
    ]));
    offset += local.length + data.length;
  }
  const centralSize = central.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
    ...u32(centralSize), ...u32(offset), ...u16(0),
  ]);
  return new Blob([...parts, ...central, end], { type: "application/zip" });
}

const roundHalf = (value) => Math.round(value * 2) / 2;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, Number(value) || minimum));
const feetInches = (value) => {
  let feet = Math.floor(value);
  let inches = Math.round((value - feet) * 12);
  if (inches === 12) { feet += 1; inches = 0; }
  return `${feet}'-${inches}"`;
};

const VARIANTS = [
  { name: "Courtyard Light", summary: "A central open-to-sky pocket supports daylight and cross-ventilation." },
  { name: "Open Social", summary: "A generous connected living, dining and kitchen zone prioritizes family life." },
  { name: "Quiet Zones", summary: "Clear separation between social rooms and private bedrooms reduces disturbance." },
];

function createDesign(width, length, bedrooms, floors, facing, variant = 0) {
  width = roundHalf(clamp(width, 18, 100));
  length = roundHalf(clamp(length, 24, 150));
  bedrooms = Math.round(clamp(bedrooms, 2, 3));
  floors = Math.round(clamp(floors, 1, 3));
  const side = roundHalf(Math.max(2, Math.min(4, width * 0.08)));
  const front = roundHalf(Math.max(5, Math.min(10, length * 0.14)));
  const rear = roundHalf(Math.max(3, Math.min(6, length * 0.09)));
  const buildW = +(width - side * 2).toFixed(2);
  const buildD = +(length - front - rear).toFixed(2);
  const frontDepth = roundHalf(buildD * 0.42);
  const serviceDepth = roundHalf(buildD * 0.24);
  const rearDepth = +(buildD - frontDepth - serviceDepth).toFixed(2);
  const leftW = roundHalf(buildW * 0.56);
  const rightW = +(buildW - leftW).toFixed(2);
  const kitchenW = roundHalf(buildW * 0.42);
  const bathW = Math.min(7, roundHalf(buildW * 0.23));
  const diningW = +(buildW - kitchenW - bathW).toFixed(2);
  const masterW = roundHalf(buildW * 0.54);
  let rooms;
  if (variant === 1) {
    const socialW = roundHalf(buildW * 0.64);
    const midLeft = roundHalf(buildW * 0.46);
    rooms = [
      { name: "Living + dining", x: 0, y: 0, w: socialW, d: frontDepth },
      { name: "Kitchen", x: socialW, y: 0, w: buildW - socialW, d: frontDepth },
      { name: "Bedroom 2", x: 0, y: frontDepth, w: midLeft, d: serviceDepth },
      { name: "Bath", x: midLeft, y: frontDepth, w: bathW, d: serviceDepth },
      { name: "Light court", x: midLeft + bathW, y: frontDepth, w: buildW - midLeft - bathW, d: serviceDepth },
      { name: "Master bedroom", x: 0, y: frontDepth + serviceDepth, w: masterW, d: rearDepth },
      { name: bedrooms >= 3 ? "Bedroom 3" : "Study", x: masterW, y: frontDepth + serviceDepth, w: buildW - masterW, d: rearDepth },
    ];
  } else if (variant === 2) {
    const entryW = roundHalf(buildW * 0.48);
    const privateW = roundHalf(buildW * 0.5);
    rooms = [
      { name: "Living", x: 0, y: 0, w: entryW, d: frontDepth },
      { name: "Kitchen + dining", x: entryW, y: 0, w: buildW - entryW, d: frontDepth },
      { name: "Family lounge", x: 0, y: frontDepth, w: buildW - bathW, d: serviceDepth },
      { name: "Bath", x: buildW - bathW, y: frontDepth, w: bathW, d: serviceDepth },
      { name: "Master bedroom", x: 0, y: frontDepth + serviceDepth, w: privateW, d: rearDepth },
      { name: "Bedroom 2", x: privateW, y: frontDepth + serviceDepth, w: buildW - privateW, d: rearDepth / 2 },
      { name: bedrooms >= 3 ? "Bedroom 3" : "Study", x: privateW, y: frontDepth + serviceDepth + rearDepth / 2, w: buildW - privateW, d: rearDepth / 2 },
    ];
  } else {
    rooms = [
      { name: "Living", x: 0, y: 0, w: leftW, d: frontDepth },
      { name: "Bedroom 2", x: leftW, y: 0, w: rightW, d: frontDepth },
      { name: "Kitchen", x: 0, y: frontDepth, w: kitchenW, d: serviceDepth },
      { name: "Dining", x: kitchenW, y: frontDepth, w: diningW, d: serviceDepth },
      { name: "Bath", x: kitchenW + diningW, y: frontDepth, w: bathW, d: serviceDepth },
      { name: "Master bedroom", x: 0, y: frontDepth + serviceDepth, w: masterW, d: rearDepth },
      { name: bedrooms >= 3 ? "Bedroom 3" : "Study", x: masterW, y: frontDepth + serviceDepth, w: +(buildW - masterW).toFixed(2), d: rearDepth },
    ];
  }
  const plotArea = width * length;
  const floorArea = buildW * buildD;
  const builtUp = Math.round(floorArea * floors);
  const cost = Math.round(builtUp * 2150);
  return { width, length, bedrooms, floors, facing, side, front, rear, buildW, buildD, rooms, plotArea, floorArea, builtUp, cost, variant, variantName: VARIANTS[variant].name, designSummary: VARIANTS[variant].summary };
}

function floorSvg(design, floor = 0) {
  const scale = 18;
  const pad = 70;
  const siteW = design.width * scale;
  const siteH = design.length * scale;
  const bx = pad + design.side * scale;
  const by = pad + design.front * scale;
  const labels = design.rooms.map((room) => {
    const x = bx + room.x * scale;
    const y = by + room.y * scale;
    return `<rect x="${x}" y="${y}" width="${room.w * scale}" height="${room.d * scale}" fill="#ffffff" stroke="#0F172A" stroke-width="5"/>
<text x="${x + room.w * scale / 2}" y="${y + room.d * scale / 2 - 8}" text-anchor="middle" font-family="Arial" font-size="17" font-weight="700">${room.name}</text>
<text x="${x + room.w * scale / 2}" y="${y + room.d * scale / 2 + 16}" text-anchor="middle" font-family="Arial" font-size="14">${feetInches(room.w)} × ${feetInches(room.d)}</text>`;
  }).join("\n");
  const floorName = floor === 0 ? "GROUND FLOOR" : `FLOOR ${floor + 1}`;
  const balcony = floor > 0 ? `<rect x="${pad + siteW * 0.28}" y="${by - 32}" width="${siteW * 0.44}" height="32" fill="#dbeafe" stroke="#2563EB" stroke-width="3"/><text x="${pad + siteW / 2}" y="${by - 11}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700">BALCONY</text>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${siteW + pad * 2}" height="${siteH + pad * 2 + 80}" viewBox="0 0 ${siteW + pad * 2} ${siteH + pad * 2 + 80}">
<rect width="100%" height="100%" fill="#EAF3FF"/>
<text x="${pad}" y="27" font-family="Arial" font-size="21" font-weight="700" fill="#0F172A">ENGINEERING DRAWING</text>
<text x="${pad}" y="48" font-family="Arial" font-size="12" font-weight="700" fill="#7C3AED">${floorName} — ${design.variantName.toUpperCase()}</text>
<rect x="${pad}" y="${pad}" width="${siteW}" height="${siteH}" fill="none" stroke="#2563EB" stroke-width="4"/>
<text x="${pad + siteW / 2}" y="${pad - 14}" text-anchor="middle" font-family="Arial" font-size="16">PLOT WIDTH ${design.width}'-0"</text>
<text transform="translate(${pad - 20},${pad + siteH / 2}) rotate(-90)" text-anchor="middle" font-family="Arial" font-size="16">PLOT LENGTH ${design.length}'-0"</text>
${labels}
${balcony}
<text x="${pad + siteW - 10}" y="${pad + 25}" text-anchor="end" font-family="Arial" font-size="16" font-weight="700">N ↑</text>
<text x="${pad}" y="${pad + siteH + 35}" font-family="Arial" font-size="14">Setbacks: front ${design.front}' · rear ${design.rear}' · sides ${design.side}' each</text>
<text x="${pad}" y="${pad + siteH + 60}" font-family="Arial" font-size="12">All dimensions in feet. Concept only; verify on site before construction.</text>
</svg>`;
}

function elevationSvg(design) {
  const width = 900;
  const floorH = 165;
  const height = 150 + design.floors * floorH;
  const levels = Array.from({ length: design.floors }, (_, floor) => {
    const y = 80 + (design.floors - floor - 1) * floorH;
    const balcony = floor > 0 ? `<rect x="300" y="${y + 112}" width="300" height="36" fill="#DBEAFE" stroke="#2563EB" stroke-width="4"/><line x1="320" y1="${y + 112}" x2="320" y2="${y + 148}" stroke="#2563EB" stroke-width="3"/><line x1="580" y1="${y + 112}" x2="580" y2="${y + 148}" stroke="#2563EB" stroke-width="3"/>` : "";
    return `<rect x="120" y="${y}" width="660" height="${floorH}" fill="#FFFFFF" stroke="#0F172A" stroke-width="4"/>
<rect x="180" y="${y + 45}" width="110" height="82" fill="#BFDBFE" stroke="#2563EB" stroke-width="10"/>
<rect x="395" y="${y + 35}" width="110" height="112" fill="#7C3AED" stroke="#5B21B6" stroke-width="7"/>
<rect x="610" y="${y + 45}" width="110" height="82" fill="#BFDBFE" stroke="#2563EB" stroke-width="10"/>
${balcony}<text x="100" y="${y + 88}" text-anchor="end" font-family="Arial" font-size="13" fill="#64748B">${floor === 0 ? "GROUND" : `FLOOR ${floor + 1}`}</text>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#EAF3FF"/><text x="60" y="36" font-family="Arial" font-size="22" font-weight="700" fill="#0F172A">ENGINEERING DRAWING — FRONT ELEVATION</text>${levels}<rect x="95" y="${80 + design.floors * floorH}" width="710" height="24" fill="#94A3B8"/><text x="450" y="${height - 22}" text-anchor="middle" font-family="Arial" font-size="12" fill="#64748B">${design.width}' × ${design.length}' plot · ${design.facing} facing · Concept elevation</text></svg>`;
}

function projectReportHtml(design, materials) {
  const roomRows = design.rooms.map((room, index) => `<tr><td>${String(index + 1).padStart(2, "0")}</td><td>${room.name}</td><td>${feetInches(room.w)} × ${feetInches(room.d)}</td><td>${(room.w * room.d).toFixed(1)} sq ft</td></tr>`).join("");
  const materialRows = materials.map(([name, quantity, cost]) => `<tr><td>${name}</td><td>${quantity}</td><td>₹${Number(cost).toLocaleString("en-IN")}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Engineering Drawing — ${design.variantName} Project Report</title><style>
@page{size:A4;margin:18mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#334155;margin:0;line-height:1.5}.cover{min-height:920px;padding:55px;background:linear-gradient(145deg,#0f172a,#1e40af);color:#fff;display:flex;flex-direction:column;justify-content:space-between}.brand{font-size:14px;font-weight:800;letter-spacing:.16em}.cover h1{font-size:52px;line-height:1.02;margin:0;max-width:620px}.accent{color:#c4b5fd}.meta{display:grid;grid-template-columns:1fr 1fr;gap:18px;border-top:1px solid #ffffff55;padding-top:24px}.meta small{display:block;color:#bfdbfe}.page{page-break-before:always;padding:20px 0}h2{font-size:28px;color:#0f172a;border-bottom:3px solid #7c3aed;padding-bottom:10px}h3{color:#1e40af;margin-top:28px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.metric{padding:16px;background:#eaf3ff;border-left:4px solid #2563eb}.metric small{display:block;font-size:10px;color:#64748b}.metric b{font-size:20px;color:#0f172a}table{width:100%;border-collapse:collapse;margin:14px 0}th,td{padding:10px;border-bottom:1px solid #dbe3ef;text-align:left;font-size:12px}th{background:#0f172a;color:#fff}.note{padding:16px;background:#fef3c7;border-left:4px solid #f59e0b;font-size:12px}.footer{margin-top:35px;border-top:1px solid #cbd5e1;padding-top:12px;font-size:10px;color:#64748b}@media print{.cover{min-height:250mm}}</style></head><body>
<section class="cover"><div class="brand">ENGINEERING DRAWING · RESIDENTIAL CONCEPT LAB</div><div><p class="accent">CONCEPT DESIGN REPORT</p><h1>${design.variantName}<br/>Residential Home</h1><p>${design.designSummary}</p></div><div class="meta"><div><small>PLOT</small><b>${design.width}' × ${design.length}' · ${design.facing} facing</b></div><div><small>PROJECT</small><b>${design.bedrooms} BHK · ${design.floors} floor${design.floors > 1 ? "s" : ""}</b></div><div><small>BUILT-UP AREA</small><b>${design.builtUp.toLocaleString()} sq ft</b></div><div><small>PRELIMINARY ESTIMATE</small><b>₹${design.cost.toLocaleString("en-IN")}</b></div></div></section>
<section class="page"><h2>Project Summary</h2><div class="grid"><div class="metric"><small>PLOT AREA</small><b>${design.plotArea} sq ft</b></div><div class="metric"><small>FOOTPRINT</small><b>${design.floorArea.toFixed(1)} sq ft</b></div><div class="metric"><small>BUILT-UP</small><b>${design.builtUp} sq ft</b></div></div><h3>Design intent</h3><p>${design.designSummary} The layout uses practical half-foot planning increments and maintains coordinated geometry between the drawings, 3D model, quantities and estimate.</p><h3>Site planning</h3><table><tr><th>Element</th><th>Dimension</th></tr><tr><td>Buildable footprint</td><td>${feetInches(design.buildW)} × ${feetInches(design.buildD)}</td></tr><tr><td>Front setback</td><td>${feetInches(design.front)}</td></tr><tr><td>Rear setback</td><td>${feetInches(design.rear)}</td></tr><tr><td>Side setbacks</td><td>${feetInches(design.side)} each</td></tr></table><h3>Room schedule</h3><table><tr><th>No.</th><th>Space</th><th>Dimensions</th><th>Area</th></tr>${roomRows}</table></section>
<section class="page"><h2>Materials & Cost</h2><table><tr><th>Material</th><th>Preliminary quantity</th><th>Estimated cost</th></tr>${materialRows}</table><h3>Professional review requirements</h3><div class="note">This package is a coordinated concept—not a permit, structural design or construction authorization. A licensed architect and structural engineer must verify boundaries, local setbacks, soil conditions, foundations, columns, beams, services, fire safety, accessibility and authority requirements before construction.</div><h3>Package deliverables</h3><p>Floor-by-floor vector plans, front elevation, editable DXF, OBJ 3D geometry, room schedule, bill of quantities, cost breakdown, specifications and machine-readable design data.</p><div class="footer"><b>Engineering Drawing</b> · ${BRAND_SITE} · ${BRAND_EMAIL}<br/>AI-assisted engineering and construction design · © ${new Date().getFullYear()} Engineering Drawing</div></section>
</body></html>`;
}

function floorDxf(design) {
  const lines = ["0","SECTION","2","ENTITIES"];
  const addLine = (x1, y1, x2, y2, layer = "WALLS") => lines.push("0","LINE","8",layer,"10",String(x1),"20",String(y1),"30","0","11",String(x2),"21",String(y2),"31","0");
  const addText = (x, y, text) => lines.push("0","TEXT","8","LABELS","10",String(x),"20",String(y),"30","0","40","0.55","1",text);
  design.rooms.forEach((room) => {
    addLine(room.x, room.y, room.x + room.w, room.y);
    addLine(room.x + room.w, room.y, room.x + room.w, room.y + room.d);
    addLine(room.x + room.w, room.y + room.d, room.x, room.y + room.d);
    addLine(room.x, room.y + room.d, room.x, room.y);
    addText(room.x + 0.35, room.y + room.d / 2, `${room.name} ${feetInches(room.w)} x ${feetInches(room.d)}`);
  });
  lines.push("0","ENDSEC","0","EOF");
  return lines.join("\n");
}

function houseObj(design) {
  const h = 10 * design.floors;
  const wall = 0.5;
  const vertices = [];
  const faces = [];
  const addBox = (x, y, z, w, d, height) => {
    const start = vertices.length + 1;
    vertices.push([x,y,z],[x+w,y,z],[x+w,y+d,z],[x,y+d,z],[x,y,z+height],[x+w,y,z+height],[x+w,y+d,z+height],[x,y+d,z+height]);
    faces.push([start,start+1,start+2,start+3],[start+4,start+7,start+6,start+5],[start,start+4,start+5,start+1],[start+1,start+5,start+6,start+2],[start+2,start+6,start+7,start+3],[start+4,start,start+3,start+7]);
  };
  addBox(0, 0, 0, design.buildW, wall, h);
  addBox(0, design.buildD - wall, 0, design.buildW, wall, h);
  addBox(0, wall, 0, wall, design.buildD - wall * 2, h);
  addBox(design.buildW - wall, wall, 0, wall, design.buildD - wall * 2, h);
  const horizontal = [...new Set(design.rooms.map((room) => room.y + room.d).filter((y) => y < design.buildD))];
  horizontal.forEach((y) => addBox(0, y - wall / 2, 0, design.buildW, wall, h));
  const verticalSegments = design.rooms
    .filter((room) => room.x + room.w < design.buildW)
    .map((room) => ({ x: room.x + room.w, y: room.y, d: room.d }));
  verticalSegments.forEach(({ x, y, d }) => addBox(x - wall / 2, y, 0, wall, d, h));
  addBox(0, 0, -0.5, design.buildW, design.buildD, 0.5);
  addBox(0, 0, h, design.buildW, design.buildD, 0.4);
  return [
    "# EngineeringDrawing.io parametric house model",
    "# Units: feet",
    ...vertices.map((v) => `v ${v.join(" ")}`),
    ...faces.map((f) => `f ${f.join(" ")}`),
  ].join("\n");
}

function packageFiles(design) {
  const materials = [
    ["Cement", `${Math.ceil(design.builtUp * 0.4)} bags`, Math.round(design.builtUp * 152)],
    ["TMT steel", `${(design.builtUp * 0.0035).toFixed(2)} tonnes`, Math.round(design.builtUp * 245)],
    ["AAC blocks", `${Math.ceil(design.builtUp * 3.2)} nos`, Math.round(design.builtUp * 176)],
    ["Sand", `${Math.ceil(design.builtUp * 1.25)} cu ft`, Math.round(design.builtUp * 76)],
    ["Flooring", `${Math.ceil(design.floorArea)} sq ft`, Math.round(design.builtUp * 137)],
  ];
  const roomCsv = ["Room,X (ft),Y (ft),Width (ft),Depth (ft),Area (sq ft)", ...design.rooms.map((r) => `${r.name},${r.x},${r.y},${r.w},${r.d},${(r.w*r.d).toFixed(2)}`)].join("\n");
  const materialCsv = ["Material,Quantity,Estimated cost (INR)", ...materials.map((r) => r.join(","))].join("\n");
  const costCsv = ["Category,Share,Cost (INR)",["Structure,.42", "Finishes,.23", "MEP services,.18", "Doors and windows,.09", "Contingency,.08"].map((row) => {
    const [name, share] = row.split(",");
    return `${name},${Number(share) * 100}%,${Math.round(design.cost * Number(share))}`;
  }).join("\n")].join("\n");
  const readme = `ENGINEERING DRAWING — HOME CONCEPT PACKAGE

Plot: ${design.width}' × ${design.length}' (${design.plotArea} sq ft), ${design.facing} facing
Design alternative: ${design.variantName}
Planning basis: ${design.designSummary}
Buildable footprint: ${design.buildW}' × ${design.buildD}' (${design.floorArea.toFixed(2)} sq ft/floor)
Floors: ${design.floors}
Total built-up area: ${design.builtUp} sq ft
Preliminary cost: INR ${design.cost.toLocaleString("en-IN")}

PACKAGE CONTENTS
01-floor-plan.svg        Scaled, dimensioned vector floor plan
02-floor-plan.dxf        Editable CAD drawing; units are feet
03-house-model.obj       Actual 3D geometry; units are feet
04-room-schedule.csv     Exact room coordinates and dimensions
05-materials.csv         Preliminary material quantities and costs
06-cost-breakdown.csv    Category-wise cost allocation
07-design-data.json      Machine-readable complete design data

IMPORTANT
This is a parametric concept package, not a permit-ready or structural drawing.
Plot boundaries, local setbacks, soil, columns, beams, foundations, MEP routes,
fire safety and authority requirements must be verified by licensed local professionals.`;
  const specifications = [
    "Category,Concept specification,Professional verification",
    "External walls,230 mm masonry or approved equivalent,Structural and thermal design",
    "Internal walls,115 mm partitions or approved equivalent,Acoustic and services coordination",
    "Floor-to-floor height,9 ft 6 in minimum,Local code and structural system",
    "Windows,Powder-coated frame with safety glazing,Wind pressure and egress",
    "Waterproofing,Wet areas balconies and roof,Manufacturer method statement",
    "Electrical,Concealed wiring concept only,Licensed electrical design",
    "Plumbing,Coordinated fixture zones concept only,Licensed plumbing design",
  ].join("\n");
  const drawingIndex = [
    "ENGINEERING DRAWING — DOCUMENT INDEX",
    `Project: ${design.variantName} home · ${design.width}' × ${design.length}' plot`,
    "",
    "A-000 Professional project report (HTML; print to PDF)",
    ...Array.from({ length: design.floors }, (_, floor) => `A-${String(101 + floor).padStart(3, "0")} ${floor === 0 ? "Ground" : `Floor ${floor + 1}`} plan (SVG)`),
    "A-201 Front elevation (SVG)",
    "A-301 Editable coordinated floor plan (DXF)",
    "M-101 Parametric 3D building model (OBJ)",
    "S-001 Room schedule (CSV)",
    "Q-001 Preliminary bill of quantities (CSV)",
    "Q-002 Preliminary cost breakdown (CSV)",
    "SP-001 Concept specifications (CSV)",
    "D-001 Complete design data (JSON)",
    "",
    `Prepared by Engineering Drawing · ${BRAND_EMAIL} · ${BRAND_SITE}`,
  ].join("\n");
  return [
    { name: "00-DOCUMENT-INDEX.txt", content: drawingIndex },
    { name: "01-PROJECT-REPORT.html", content: projectReportHtml(design, materials) },
    ...Array.from({ length: design.floors }, (_, floor) => ({ name: `02-A-${101 + floor}-${floor === 0 ? "ground" : `floor-${floor + 1}`}-plan.svg`, content: floorSvg(design, floor) })),
    { name: "03-A-201-front-elevation.svg", content: elevationSvg(design) },
    { name: "04-A-301-editable-plan.dxf", content: floorDxf(design) },
    { name: "05-M-101-house-model.obj", content: houseObj(design) },
    { name: "06-S-001-room-schedule.csv", content: roomCsv },
    { name: "07-Q-001-materials-boq.csv", content: materialCsv },
    { name: "08-Q-002-cost-breakdown.csv", content: costCsv },
    { name: "09-SP-001-concept-specifications.csv", content: specifications },
    { name: "10-D-001-design-data.json", content: JSON.stringify(design, null, 2) },
    { name: "README.txt", content: readme },
  ];
}

export default function ConstructionDesign() {
  const [width, setWidth] = useState(30);
  const [length, setLength] = useState(40);
  const [bedrooms, setBedrooms] = useState(3);
  const [floors, setFloors] = useState(1);
  const [facing, setFacing] = useState("East");
  const [variant, setVariant] = useState(0);
  const [generated, setGenerated] = useState(false);
  const [tab, setTab] = useState("plan");
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState(localStorage.getItem("constructionPackagePaid") ? "paid" : "idle");
  const [paymentAsset, setPaymentAsset] = useState("BNB");
  const [upiReference, setUpiReference] = useState("");
  const [message, setMessage] = useState("");
  const design = useMemo(() => createDesign(width, length, bedrooms, floors, facing, variant), [width, length, bedrooms, floors, facing, variant]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const paymentResult = query.get("payment");
    const orderId = query.get("order") || localStorage.getItem("constructionPaymentOrder");
    if (paymentResult === "cancelled") {
      setGenerated(true);
      setMessage("Payment was cancelled. Your design is still available to review.");
      return;
    }
    if (paymentResult !== "return" || !orderId) return;

    setGenerated(true);
    setPaymentAsset("BNB");
    setStatus("pending");
    setMessage("Checking the secure payment status…");
    let stopped = false;
    let attempts = 0;
    const checkStatus = async () => {
      attempts += 1;
      try {
        const response = await fetch(`${API_BASE}/api/payments/nowpayments/status/${encodeURIComponent(orderId)}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not verify payment.");
        if (result.status === "finished") {
          localStorage.setItem("constructionPackagePaid", `NOWPAYMENTS-${orderId}`);
          setStatus("paid");
          setMessage("BNB payment confirmed. Your complete package is unlocked.");
          window.history.replaceState({}, "", window.location.pathname);
          return;
        }
        if (["failed", "expired", "refunded"].includes(result.status)) {
          setStatus("idle");
          setMessage(`Payment ${result.status}. Please create a new checkout.`);
          return;
        }
        if (!stopped && attempts < 30) window.setTimeout(checkStatus, 4000);
        else if (!stopped) {
          setStatus("idle");
          setMessage("Payment is still processing. Return to this page shortly to check again.");
        }
      } catch (error) {
        setStatus("idle");
        setMessage(error.message || "Could not verify payment.");
      }
    };
    checkStatus();
    return () => { stopped = true; };
  }, []);

  const useReference = () => {
    setWidth(30); setLength(40); setBedrooms(3); setFloors(1); setFacing("East"); setVariant(0); setGenerated(true);
  };

  async function connect() {
    setMessage("");
    if (!window.ethereum) return setMessage("Install MetaMask to use wallet payments.");
    try {
      await ensureEdgNetwork();
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0]);
    } catch (error) {
      setMessage(error.message || "Wallet connection was cancelled.");
    }
  }

  async function ensureEdgNetwork() {
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: EDG_CHAIN }] });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: EDG_CHAIN,
          chainName: "BNB Smart Chain",
          nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
          rpcUrls: ["https://bsc-dataseed.binance.org"],
          blockExplorerUrls: ["https://bscscan.com"],
        }],
      });
    }
  }

  async function payEdg() {
    setMessage("");
    if (!EDG_CONFIGURED || !BNB_CONFIGURED) {
      setMessage("Add valid admin-wallet and EDG contract addresses to enable EDG payments.");
      return;
    }
    try {
      await ensureEdgNetwork();
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const from = await signer.getAddress();
      setAccount(from);
      setStatus("pending");
      const token = new Contract(EDG_TOKEN, EDG_ABI, signer);
      const transaction = await token.transfer(RECEIVER, parseUnits(EDG_PRICE, EDG_DECIMALS));
      const receipt = await transaction.wait();
      if (!receipt || receipt.status !== 1) throw new Error("The EDG transaction was not confirmed.");
      localStorage.setItem("constructionPackagePaid", transaction.hash);
      setStatus("paid");
      setMessage("EDG payment confirmed. Your complete package is unlocked.");
    } catch (error) {
      setStatus("idle");
      setMessage(error.shortMessage || error.message || "EDG payment was cancelled.");
    }
  }

  async function startBnbGateway() {
    setMessage("");
    setStatus("pending");
    try {
      const response = await fetch(`${API_BASE}/api/payments/nowpayments/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          design: {
            width: design.width,
            length: design.length,
            floors: design.floors,
            bedrooms: design.bedrooms,
            facing: design.facing,
            variant: design.variantName,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.invoiceUrl) throw new Error(result.error || "Could not create checkout.");
      localStorage.setItem("constructionPaymentOrder", result.orderId);
      window.location.assign(result.invoiceUrl);
    } catch (error) {
      setStatus("idle");
      setMessage(error.message || "Could not open the secure BNB checkout.");
    }
  }

  function startUpiPayment() {
    setMessage("");
    if (!UPI_ID) {
      setMessage("Add the Engineering Drawing UPI ID to enable UPI payments.");
      return;
    }
    const note = `Home design ${design.width}x${design.length} ${design.variantName}`;
    const upiUrl = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent(UPI_NAME)}&am=${encodeURIComponent(UPI_PRICE)}&cu=INR&tn=${encodeURIComponent(note)}`;
    const anchor = document.createElement("a");
    anchor.href = upiUrl;
    anchor.click();
    setStatus("upi_pending");
    setMessage("Complete payment in your UPI app, then enter the transaction reference below.");
  }

  function submitUpiReference() {
    const reference = upiReference.trim();
    if (reference.length < 8) {
      setMessage("Enter a valid UPI transaction reference.");
      return;
    }
    localStorage.setItem("constructionUpiReference", reference);
    if (UPI_TEST_MODE) {
      localStorage.setItem("constructionPackagePaid", `UPI-TEST-${reference}`);
      setStatus("paid");
      setMessage("Local UPI test approved. Your package is unlocked.");
    } else {
      setMessage(`UPI reference ${reference} submitted. The download unlocks after payment verification.`);
    }
  }

  function download() {
    const blob = makeZip(packageFiles(design));
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `engineering-drawing-${design.width}x${design.length}-home-package.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="construction-page">
      <section className="cd-hero">
        <div className="cd-copy">
          <span className="cd-kicker">AI-assisted residential planning</span>
          <h1>Plan the right home for your plot.</h1>
          <p>Enter your land dimensions to receive a practical floor plan, 3D building model, materials schedule and transparent construction estimate.</p>
          <div className="cd-steps"><span><b>01</b> Enter plot</span><span><b>02</b> Check design</span><span><b>03</b> Download</span></div>
        </div>
        <div className="cd-form-card">
          <div className="cd-card-title"><div><small>NEW HOME CONCEPT</small><h2>Your plot details</h2></div><span>01 / 03</span></div>
          <button className="cd-reference" onClick={useReference}><i>30 × 40</i><span><b>Use reference plot</b><small>3 BHK · East facing · Single floor</small></span><strong>Use →</strong></button>
          <div className="cd-or">OR ENTER YOUR OWN</div>
          <div className="cd-dimensions">
            <label>WIDTH <span><input aria-label="Plot width" type="number" min="18" max="100" step="0.5" value={width} onChange={(e) => setWidth(e.target.value)} onBlur={() => setWidth(design.width)} /> ft</span></label>
            <b>×</b>
            <label>LENGTH <span><input aria-label="Plot length" type="number" min="24" max="150" step="0.5" value={length} onChange={(e) => setLength(e.target.value)} onBlur={() => setLength(design.length)} /> ft</span></label>
          </div>
          <div className="cd-selects">
            <label>BEDROOMS<select value={bedrooms} onChange={(e) => setBedrooms(+e.target.value)}><option>2</option><option>3</option></select></label>
            <label>FLOORS<select value={floors} onChange={(e) => setFloors(+e.target.value)}><option>1</option><option>2</option><option>3</option></select></label>
            <label>ROAD FACING<select value={facing} onChange={(e) => setFacing(e.target.value)}><option>East</option><option>North</option><option>West</option><option>South</option></select></label>
          </div>
          <button className="cd-primary" onClick={() => setGenerated(true)}>Generate my design <span>→</span></button>
        </div>
      </section>

      {generated && (
        <section className="cd-results">
          <div className="cd-result-head">
            <div><span className="cd-kicker">Recommended concept · alternative {variant + 1} of {VARIANTS.length}</span><h2>{design.variantName} home</h2><p>{design.designSummary}</p></div>
            <div className="cd-metrics"><span><small>PLOT</small><b>{design.plotArea} sq ft</b></span><span><small>BUILT-UP</small><b>{design.builtUp} sq ft</b></span><span><small>ESTIMATE</small><b>₹{(design.cost/100000).toFixed(1)} lakh</b><em>≈ ${Math.round(design.cost / COST_USD_INR).toLocaleString("en-US")}</em></span></div>
          </div>
          <div className="cd-alternatives">
            <div>{VARIANTS.map((option, index) => <button key={option.name} className={variant === index ? "active" : ""} onClick={() => setVariant(index)}><small>0{index + 1}</small><b>{option.name}</b></button>)}</div>
            <button className="cd-another" onClick={() => setVariant((variant + 1) % VARIANTS.length)}>Show another design ↻</button>
          </div>
          <div className="cd-workspace">
            <div className="cd-tabs">
              {[["plan","Floor plan"],["3d","3D model"],["materials","Materials"],["cost","Cost"]].map(([key,label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}
            </div>
            <div className="cd-canvas">
              {tab === "plan" && <FloorPlan design={design} />}
              {tab === "3d" && <ConstructionModel3D design={design} />}
              {tab === "materials" && <Materials design={design} />}
              {tab === "cost" && <Costs design={design} />}
            </div>
            <aside className="cd-download-panel">
              <small>COMPLETE DESIGN PACKAGE</small>
              <h3>Everything needed to review the concept</h3>
              <ul><li>Branded printable report</li><li>Floor-by-floor SVG plans</li><li>Front elevation drawing</li><li>Editable DXF drawing</li><li>Actual OBJ 3D model</li><li>BOQ, cost and specifications</li></ul>
              <div className={`cd-payment-choice ${UPI_ENABLED ? "three" : "two"}`}>
                <button className={paymentAsset === "BNB" ? "active" : ""} onClick={() => setPaymentAsset("BNB")}><PaymentMark type="BNB" /><b>BNB Gateway</b><small>Secure checkout</small></button>
                <button className={paymentAsset === "EDG" ? "active" : ""} onClick={() => setPaymentAsset("EDG")}><PaymentMark type="EDG" /><b>EDG</b><small>{EDG_PRICE} EDG</small></button>
                {UPI_ENABLED && <button className={paymentAsset === "UPI" ? "active" : ""} onClick={() => setPaymentAsset("UPI")}><PaymentMark type="UPI" /><b>UPI</b><small>₹{UPI_PRICE}</small></button>}
              </div>
              <div className="cd-price"><span>{paymentAsset === "UPI" ? "UPI design package" : paymentAsset === "EDG" ? "BSC Mainnet download" : "NOWPayments checkout"}</span><b>{paymentAsset === "BNB" ? `$${CONSTRUCTION_PRICE_USD}` : paymentAsset === "EDG" ? EDG_PRICE : `₹${UPI_PRICE}`} <small>{paymentAsset === "BNB" ? "USD" : paymentAsset === "EDG" ? "EDG" : ""}</small></b><em>{paymentAsset === "UPI" ? "Payment verification required" : paymentAsset === "EDG" ? "Real token transfer · verify before confirming" : "BNB on BSC · hosted secure checkout"}</em></div>
              {status === "paid" ? <button className="cd-download" onClick={download}>Download professional package ↓</button> : <button className="cd-download" disabled={status === "pending" || (paymentAsset === "EDG" && (!EDG_CONFIGURED || !BNB_CONFIGURED)) || (paymentAsset === "UPI" && !UPI_ID)} onClick={paymentAsset === "UPI" ? startUpiPayment : paymentAsset === "BNB" ? startBnbGateway : !account ? connect : payEdg}>{status === "pending" ? "Confirming transaction…" : paymentAsset === "UPI" ? UPI_ID ? `Pay ₹${UPI_PRICE} with UPI` : "Configure UPI ID" : paymentAsset === "EDG" && (!EDG_CONFIGURED || !BNB_CONFIGURED) ? "Configure EDG + admin wallet" : paymentAsset === "BNB" ? "Pay securely with BNB" : !account ? "Connect MetaMask" : `Pay ${EDG_PRICE} EDG & unlock`}</button>}
              {status === "upi_pending" && <div className="cd-upi-reference"><label>UPI TRANSACTION REFERENCE<input value={upiReference} onChange={(event) => setUpiReference(event.target.value)} placeholder="Enter UTR / transaction ID" /></label><button onClick={submitUpiReference}>{UPI_TEST_MODE ? "Verify test payment" : "Submit for verification"}</button></div>}
              {message && <p className="cd-message">{message}</p>}
              {paymentAsset === "EDG" && !BNB_CONFIGURED && <p className="cd-test-mode">A valid admin MetaMask address is required.</p>}
            </aside>
          </div>
          <p className="cd-disclaimer">Concept design only. Exact site conditions, structure, services and authority compliance require review by licensed local professionals.</p>
        </section>
      )}
    </main>
  );
}

function PaymentMark({ type }) {
  if (type === "EDG") return <span className="cd-pay-mark edg" aria-hidden="true"><img src="/assets/edg_logo.svg" alt="" /></span>;
  if (type === "UPI") return <span className="cd-pay-mark upi" aria-hidden="true"><i>U</i><i>P</i><i>I</i><em>›</em></span>;
  return <span className="cd-pay-mark bnb" aria-hidden="true">◆</span>;
}

function FloorPlan({ design }) {
  const [viewFloor, setViewFloor] = useState(0);
  useEffect(() => {
    if (viewFloor >= design.floors) setViewFloor(design.floors - 1);
  }, [design.floors, viewFloor]);
  const floorLabel = viewFloor === 0 ? "Ground floor" : `Floor ${viewFloor + 1}`;
  return (
    <div className="cd-plan-wrap">
      <div className="cd-floor-picker">
        {Array.from({ length: design.floors }, (_, floor) => <button key={floor} className={viewFloor === floor ? "active" : ""} onClick={() => setViewFloor(floor)}>{floor === 0 ? "Ground" : `Floor ${floor + 1}`}</button>)}
      </div>
      <div className="cd-site-label"><span>{floorLabel} · PLOT {design.width}' × {design.length}' · {design.facing.toUpperCase()} FACING</span><b>N ↑</b></div>
      <div className="cd-plan-frame">
      <div className="cd-plan" style={{ aspectRatio: `${design.buildW}/${design.buildD}` }}>
        {design.rooms.map((room) => <div key={room.name} className="cd-room" style={{ left:`${room.x/design.buildW*100}%`, top:`${room.y/design.buildD*100}%`, width:`${room.w/design.buildW*100}%`, height:`${room.d/design.buildD*100}%` }}><b>{room.name}</b><small>{feetInches(room.w)} × {feetInches(room.d)}</small></div>)}
        {viewFloor > 0 && <div className="cd-balcony-plan"><b>BALCONY</b><small>{feetInches(Math.min(12, design.buildW * 0.48))} × 4'-0"</small></div>}
      </div>
      </div>
      <div className="cd-setbacks"><span>← {design.side}' side</span><span>{design.front}' front · {design.rear}' rear</span><span>{design.side}' side →</span></div>
    </div>
  );
}

function Materials({ design }) {
  const rows = [["Cement",`${Math.ceil(design.builtUp*.4)} bags`],["TMT steel",`${(design.builtUp*.0035).toFixed(2)} tonnes`],["AAC blocks",`${Math.ceil(design.builtUp*3.2)} nos`],["Sand",`${Math.ceil(design.builtUp*1.25)} cu ft`],["Flooring",`${Math.ceil(design.floorArea)} sq ft`]];
  return <div className="cd-table"><h3>Preliminary material schedule</h3>{rows.map(([name,qty]) => <div key={name}><b>{name}</b><span>{qty}</span></div>)}</div>;
}

function Costs({ design }) {
  const rows = [["Structure",.42],["Finishes",.23],["MEP services",.18],["Openings",.09],["Contingency",.08]];
  return <div className="cd-table cd-cost"><h3>Estimated construction cost</h3><div className="cd-cost-total"><strong>₹{design.cost.toLocaleString("en-IN")}</strong><span>≈ ${Math.round(design.cost / COST_USD_INR).toLocaleString("en-US")} USD</span><small>Indicative conversion at ₹{COST_USD_INR}/USD</small></div>{rows.map(([name,part]) => { const inr = Math.round(design.cost*part); return <div key={name}><b>{name}</b><span><strong>₹{inr.toLocaleString("en-IN")}</strong><small>≈ ${Math.round(inr / COST_USD_INR).toLocaleString("en-US")}</small></span></div>; })}</div>;
}
