const encoder = new TextEncoder();
const xmlEscape = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

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

export function makeZip(files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const u16 = (v) => new Uint8Array([v & 255, (v >>> 8) & 255]);
  const u32 = (v) => new Uint8Array([v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]);
  const add = (...items) => { chunks.push(...items); offset += items.reduce((sum, item) => sum + item.length, 0); };
  Object.entries(files).forEach(([name, content]) => {
    const filename = encoder.encode(name);
    const data = content instanceof Uint8Array ? content : encoder.encode(String(content));
    const crc = crc32(data);
    const start = offset;
    add(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(data.length), u32(data.length), u16(filename.length), u16(0), filename, data);
    central.push({ filename, crc, size: data.length, start });
  });
  const centralStart = offset;
  central.forEach(({ filename, crc, size, start }) => add(
    u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size),
    u16(filename.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(start), filename
  ));
  const centralSize = offset - centralStart;
  add(u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(centralSize), u32(centralStart), u16(0));
  return new Blob(chunks, { type: "application/zip" });
}

function colName(index) {
  let name = "";
  for (let value = index; value > 0; value = Math.floor((value - 1) / 26)) name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  return name;
}

function sheetXml(rows, formulas = {}) {
  const rowXml = rows.map((row, rIndex) => {
    const cells = row.map((value, cIndex) => {
      const ref = `${colName(cIndex + 1)}${rIndex + 1}`;
      const formula = formulas[ref];
      const style = rIndex === 0 ? 1 : rIndex === 1 ? 4 : rIndex === 2 ? 5 : rIndex === 4 ? 6 : typeof value === "number" ? 3 : cIndex === 0 ? 2 : 0;
      if (formula) return `<c r="${ref}" s="${style}"><f>${xmlEscape(formula)}</f><v>0</v></c>`;
      if (typeof value === "number") return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
      return `<c r="${ref}" t="inlineStr" s="${style}"><is><t>${xmlEscape(value)}</t></is></c>`;
    }).join("");
    const height = rIndex === 0 ? 28 : rIndex === 1 ? 24 : rIndex === 2 ? 20 : rIndex === 4 ? 26 : null;
    return `<row r="${rIndex + 1}"${height ? ` ht="${height}" customHeight="1"` : ""}>${cells}</row>`;
  }).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView showGridLines="0" workbookViewId="0"><pane ySplit="5" topLeftCell="A6" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="29" customWidth="1"/><col min="2" max="2" width="31" customWidth="1"/><col min="3" max="5" width="28" customWidth="1"/><col min="6" max="8" width="18" customWidth="1"/></cols><sheetData>${rowXml}</sheetData><mergeCells count="3"><mergeCell ref="A1:H1"/><mergeCell ref="A2:H2"/><mergeCell ref="A3:H3"/></mergeCells><autoFilter ref="A5:H${Math.max(5, rows.length)}"/><printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.55" bottom="0.55" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/></worksheet>`;
}

function controlledSheet(title, documentNo, header, data) {
  return [
    ["ENGINEERING DRAWING · ENERGY EFFICIENT MVR EVAPORATOR"],
    [title],
    [`Document ${documentNo}  |  Revision P01  |  PRELIMINARY · NOT FOR CONSTRUCTION  |  engineeringdrawing.io`],
    [""],
    header,
    ...data,
  ];
}

export function createEvaporatorWorkbook(design) {
  const basis = [
    ["ENGINEERING DRAWING · MVR EVAPORATOR BASIC ENGINEERING PACKAGE", "Value", "Unit / note"],
    ["Hourly feed capacity", design.inputs.capacityTph, "tonne/hour"],
    ["Daily mass throughput", design.inputs.dailyThroughputTpd, "tonne/day"],
    ["Daily volumetric throughput", design.inputs.dailyFeedKld, "KLD at stated density"],
    ["Operating hours", design.inputs.operatingHours, "h/day"],
    ["Feed solids concentration", design.inputs.feedConc / 100, "mass fraction"],
    ["Final solids concentration", design.inputs.finalConc / 100, "mass fraction"],
    ["Feed density", design.inputs.density, "kg/m³"],
    ["Feed temperature", design.inputs.feedTemp, "°C"],
    ["Boiling temperature", design.inputs.boilingTemp, "°C"],
    ["MVR heat lift", design.inputs.heatLift, "K"],
    ["Compressor isentropic efficiency", design.inputs.compressorEfficiency / 100, "fraction"],
    ["Overall U value", design.inputs.uValue, "W/m²·K"],
    ["Heat recovery", design.inputs.heatRecovery / 100, "fraction"],
    ["Design status", "Preliminary BEP", "Licensed engineer review required"],
  ];
  const mass = [
    ["HEAT & MASS BALANCE", "Value", "Unit"],
    ["Feed flow", design.massBalance.feedKgH, "kg/h"],
    ["Dry solids", design.massBalance.solidsKgH, "kg/h"],
    ["Concentrate", design.massBalance.productKgH, "kg/h"],
    ["Evaporation", design.massBalance.evaporationKgH, "kg/h"],
    ["Concentration ratio", design.massBalance.concentrationRatio, "x"],
    ["Water recovery", design.massBalance.waterRecoveryPct, "%"],
    ["Daily solids load", design.massBalance.tdsLoadKgDay, "kg/day"],
    ["Daily concentrate / reject", design.massBalance.rejectLDay, "L/day"],
    ["Mass balance closure", design.massBalance.closureKgH, "kg/h"],
    ["Sensible duty", design.thermal.sensibleKw, "kW"],
    ["Latent duty", design.thermal.latentKw, "kW"],
    ["External heat", design.thermal.externalHeatKw, "kW"],
    ["Design area", design.thermal.designAreaM2, "m²"],
    ["MVR compressor", design.thermal.compressorPowerKw, "kW"],
    ["MVR selected motor", design.thermal.compressorMotorKw, "kW"],
    ["Pump auxiliaries absorbed", design.thermal.auxiliaryPowerKw, "kW"],
    ["Total plant absorbed", design.thermal.totalAbsorbedPowerKw, "kW"],
    ["Total connected motor load", design.thermal.totalConnectedPowerKw, "kW"],
    ["MVR specific electricity", design.thermal.specificEnergyKwhT, "kWh/t evaporation"],
    ["Total specific electricity", design.thermal.specificPlantEnergyKwhT, "kWh/t evaporation"],
    ["MVR suction pressure", design.thermal.suctionPressureKpa, "kPa abs"],
    ["MVR discharge pressure", design.thermal.dischargePressureKpa, "kPa abs"],
  ];
  const equipment = [["TAG", "EQUIPMENT", "DESIGN DUTY", "MATERIAL"], ...design.equipment.map((item) => [item.tag, item.name, item.duty, item.material])];
  const lines = [["LINE", "SERVICE", "SIZE", "SCHEDULE", "MATERIAL", "FLOW m³/h", "VELOCITY m/s"], ...design.lines.map((item) => [item.lineNo, item.service, item.size, item.schedule, item.material, item.flowM3h, item.velocity])];
  const valves = [["TAG", "SERVICE", "SIZE", "TYPE", "MATERIAL"], ...design.valves.map((item) => [item.tag, item.service, item.size, item.type, item.material])];
  const cost = [
    ["BUDGETARY CAPITAL COST ESTIMATE", "USD", "INR"],
    ...design.cost.items.map((item) => [item.item, item.usd, Math.round(item.usd * design.cost.exchangeRateInrUsd)]),
    ["Subtotal", design.cost.subtotalUsd, Math.round(design.cost.subtotalUsd * design.cost.exchangeRateInrUsd)],
    ["Contingency (15%)", design.cost.contingencyUsd, Math.round(design.cost.contingencyUsd * design.cost.exchangeRateInrUsd)],
    ["TOTAL INSTALLED COST", design.cost.totalInstalledUsd, design.cost.totalInstalledInr],
    ["Estimate classification", design.cost.accuracy, "Budgetary only"],
    ["Exclusions", design.cost.exclusions, ""],
  ];
  const pumps = [["TAG", "SERVICE", "FLOW m³/h", "HEAD m", "ABSORBED kW", "MOTOR kW", "MOC"], ...design.pumps.map((item) => [item.tag, item.service, item.flowM3h, item.headM, item.powerKw, item.motorKw, item.material])];
  const instruments = [["TAG", "SERVICE", "TYPE", "RANGE", "FUNCTION"], ...design.instruments.map((item) => [item.tag, item.service, item.type, item.range, item.function])];
  const utilities = [["UTILITY", "DESIGN BASIS", "ESTIMATED DEMAND", "ENGINEERING NOTE"], ...design.utilities.map((item) => [item.utility, item.design, item.demand, item.note])];
  const documentRegister = [
    ["DOCUMENT NO.", "DOCUMENT TITLE", "REV.", "STATUS"],
    ["ED-MVR-BEP-001", "Basic engineering design report", "P01", "Preliminary"],
    ["ED-MVR-CAL-001", "Process calculation workbook", "P01", "Preliminary"],
    ["ED-MVR-PFD-001", "Process flow diagram and stream balance", "P01", "Preliminary"],
    ["ED-MVR-EQL-001", "Equipment and pump schedule", "P01", "Preliminary"],
    ["ED-MVR-LL-001", "Line list", "P01", "Preliminary"],
    ["ED-MVR-VL-001", "Valve list", "P01", "Preliminary"],
    ["ED-MVR-IL-001", "Instrument index", "P01", "Preliminary"],
    ["ED-MVR-UL-001", "Utility summary", "P01", "Preliminary"],
    ["ED-MVR-CE-001", "Class 4 budget estimate", "P01", "Budgetary"],
  ];
  const sheets = [
    ["Document Register", controlledSheet("Controlled document register", "ED-MVR-DR-001", documentRegister[0], documentRegister.slice(1))],
    ["Design Basis", controlledSheet("Process design basis", "ED-MVR-DB-001", basis[0], basis.slice(1))],
    ["Heat Mass Balance", controlledSheet("Heat and mass balance", "ED-MVR-HMB-001", mass[0], mass.slice(1))],
    ["Equipment List", controlledSheet("Equipment schedule", "ED-MVR-EQL-001", equipment[0], equipment.slice(1))],
    ["Pump Schedule", controlledSheet("Pump hydraulic schedule", "ED-MVR-PS-001", pumps[0], pumps.slice(1))],
    ["Line List", controlledSheet("Process line list", "ED-MVR-LL-001", lines[0], lines.slice(1))],
    ["Valve List", controlledSheet("Valve schedule", "ED-MVR-VL-001", valves[0], valves.slice(1))],
    ["Instrument Index", controlledSheet("Instrument index", "ED-MVR-IL-001", instruments[0], instruments.slice(1))],
    ["Utility Summary", controlledSheet("Utility consumption summary", "ED-MVR-UL-001", utilities[0], utilities.slice(1))],
    ["Cost Estimate", controlledSheet("Class 4 budgetary installed cost", "ED-MVR-CE-001", cost[0], cost.slice(1))],
  ];
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([name], i) => `<sheet name="${xmlEscape(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets><calcPr calcMode="auto"/></workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="6"><font><sz val="10"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="14"/><name val="Aptos Display"/></font><font><b/><color rgb="FF182337"/><name val="Aptos"/></font><font><b/><color rgb="FF182337"/><sz val="13"/><name val="Aptos Display"/></font><font><color rgb="FF5D6778"/><i/><sz val="9"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Aptos"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF182337"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFB42B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF6C4CFF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><bottom style="thin"><color rgb="FFD8DEE8"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="1"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFill="1" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="1" applyFont="1"/><xf numFmtId="4" fontId="0" fillId="0" borderId="1" applyNumberFormat="1"/><xf numFmtId="0" fontId="3" fillId="0" borderId="0" applyFont="1"/><xf numFmtId="0" fontId="4" fillId="0" borderId="0" applyFont="1"/><xf numFmtId="0" fontId="5" fillId="4" borderId="0" applyFill="1" applyFont="1"/></cellXfs></styleSheet>`,
  };
  sheets.forEach(([, rows], index) => { files[`xl/worksheets/sheet${index + 1}.xml`] = sheetXml(rows); });
  return makeZip(files).arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

function csv(rows) {
  return rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

function conceptualObj(design) {
  const items = [
    ["TK-101_FEED_TANK", -4.7, 1.1, 1.7, 1.5, 2.2, 1.5],
    ["E-101_PREHEATER", -2.75, 1.15, 0, 1.1, .76, .76],
    ["EV-101_CALANDRIA", -.8, 1.6, 0, Math.max(1.3, design.geometry.calandriaDiameterM), 3.2, Math.max(1.3, design.geometry.calandriaDiameterM)],
    ["V-101_SEPARATOR", 1.25, 2.05, 0, Math.max(1.5, design.geometry.separatorDiameterM), 3.8, Math.max(1.5, design.geometry.separatorDiameterM)],
    ["C-101_MVR_COMPRESSOR", 3.15, 3.4, 0, 1.45, 1.15, 1.15],
    ["TK-102_CONDENSATE", 4.5, .8, 1.8, 1.44, 1.6, 1.44],
    ["TK-103_PRODUCT", 4.5, .8, -1.8, 1.44, 1.6, 1.44],
  ];
  let vertex = 1;
  const out = ["# Engineering Drawing - conceptual MVR evaporator arrangement", `# ${design.inputs.capacityTph} TPH / ${design.inputs.dailyThroughputTpd} TPD feed; dimensions in metres`, "# Visualization model only; not for fabrication."];
  items.forEach(([name, x, y, z, sx, sy, sz]) => {
    const x0 = x - sx / 2, x1 = x + sx / 2, y0 = y - sy / 2, y1 = y + sy / 2, z0 = z - sz / 2, z1 = z + sz / 2;
    out.push(`o ${name}`);
    [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]].forEach((point) => out.push(`v ${point.join(" ")}`));
    out.push(`f ${vertex} ${vertex+1} ${vertex+2} ${vertex+3}`, `f ${vertex+4} ${vertex+7} ${vertex+6} ${vertex+5}`,
      `f ${vertex} ${vertex+4} ${vertex+5} ${vertex+1}`, `f ${vertex+1} ${vertex+5} ${vertex+6} ${vertex+2}`,
      `f ${vertex+2} ${vertex+6} ${vertex+7} ${vertex+3}`, `f ${vertex+4} ${vertex} ${vertex+3} ${vertex+7}`);
    vertex += 8;
  });
  return out.join("\n");
}

export async function createBepPackage(design, pfdSvg) {
  const workbook = await createEvaporatorWorkbook(design);
  const report = `<!doctype html><html><head><meta charset="utf-8"><title>MVR Evaporator BEP</title><style>body{font:14px Arial;color:#182337;margin:42px}header{border-bottom:4px solid #6c4cff;padding-bottom:18px}h1{margin:4px 0}table{border-collapse:collapse;width:100%;margin:18px 0}th{background:#182337;color:#fff}th,td{padding:9px;border-bottom:1px solid #dbe1e8;text-align:left}.note{background:#f3f0ff;padding:14px;border-left:4px solid #6c4cff}</style></head><body><header><b>ENGINEERING DRAWING</b><h1>MVR Evaporator Basic Engineering Package</h1><span>${design.inputs.capacityTpd} TPD feed · ${design.inputs.feedConc}% to ${design.inputs.finalConc}% concentration</span></header><h2>Design summary</h2><table><tr><th>Parameter</th><th>Result</th></tr><tr><td>Evaporation</td><td>${design.massBalance.evaporationKgH} kg/h</td></tr><tr><td>Design heat-transfer area</td><td>${design.thermal.designAreaM2} m²</td></tr><tr><td>MVR compressor absorbed power</td><td>${design.thermal.compressorPowerKw} kW</td></tr><tr><td>External heat duty</td><td>${design.thermal.externalHeatKw} kW</td></tr></table><h2>Engineering notes</h2>${design.warnings.map((warning) => `<p class="note">${xmlEscape(warning)}</p>`).join("")}<p>Prepared by Engineering Drawing · contact@engineeringdrawing.io · https://engineeringdrawing.io</p></body></html>`;
  const professionalReport = `<!doctype html><html><head><meta charset="utf-8"><title>ED-MVR-BEP-001 · MVR Evaporator BEP</title><style>@page{size:A4;margin:16mm 15mm 17mm}*{box-sizing:border-box}body{font:10pt Arial;color:#182337;margin:0;line-height:1.45}header{display:grid;grid-template-columns:1fr auto;gap:20px;border-bottom:4px solid #6c4cff;padding:0 0 12px;margin-bottom:22px}.brand{font-size:16pt;font-weight:800}.brand i{display:inline-block;width:14px;height:14px;border:4px solid #ffb42b;border-radius:50%;margin-right:8px}.control{font-size:8pt;text-align:right;color:#5d6778}h1{font-size:22pt;margin:4px 0 6px}h2{font-size:13pt;margin:22px 0 8px;border-left:4px solid #ffb42b;padding-left:9px}.meta,.cards{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.cards{grid-template-columns:repeat(4,1fr);margin:14px 0}.card,.note{background:#f5f7fb;border:1px solid #dbe1e8;border-radius:6px;padding:10px}.card small{display:block;color:#697386;text-transform:uppercase;font-size:7pt}.card b{font-size:14pt}table{border-collapse:collapse;width:100%;margin:8px 0 16px}th{background:#182337;color:#fff;text-transform:uppercase;font-size:7.5pt}th,td{padding:7px 8px;border-bottom:1px solid #dbe1e8;text-align:left;vertical-align:top}.note{border-left:4px solid #6c4cff;margin:7px 0}.status{color:#6c4cff;font-weight:700}.footer{margin-top:24px;border-top:1px solid #dbe1e8;padding-top:9px;font-size:8pt;color:#697386}.page-break{page-break-before:always}@media(max-width:700px){.cards{grid-template-columns:repeat(2,1fr)}.meta{grid-template-columns:1fr}}</style></head><body><header><div><div class="brand"><i></i>ENGINEERING DRAWING</div><h1>Energy Efficient MVR Evaporator</h1><b>Preliminary Basic Engineering Package</b></div><div class="control">ED-MVR-BEP-001<br>Revision P01<br><span class="status">PRELIMINARY · NOT FOR CONSTRUCTION</span></div></header><div class="meta"><div><b>Client</b><br>${xmlEscape(design.inputs.clientName)}</div><div><b>Project</b><br>${xmlEscape(design.inputs.projectName)}</div><div><b>Location</b><br>${xmlEscape(design.inputs.projectLocation)}</div><div><b>Configuration</b><br>${xmlEscape(design.plantLayout.basis)}</div></div><h2>Executive design summary</h2><div class="cards"><div class="card"><small>Feed capacity</small><b>${design.inputs.capacityTph} TPH</b><br>${design.inputs.dailyThroughputTpd} TPD</div><div class="card"><small>Evaporation</small><b>${design.massBalance.evaporationKgH}</b><br>kg/h</div><div class="card"><small>Total absorbed load</small><b>${design.thermal.totalAbsorbedPowerKw}</b><br>kW</div><div class="card"><small>Installed cost</small><b>$${Number(design.cost.totalInstalledUsd).toLocaleString()}</b><br>${design.cost.accuracy}</div></div><h2>Process basis and performance</h2><table><tr><th>Parameter</th><th>Design result</th><th>Engineering basis</th></tr><tr><td>Feed concentration</td><td>${design.inputs.feedConc}% w/w</td><td>Client input</td></tr><tr><td>Final concentration</td><td>${design.inputs.finalConc}% w/w</td><td>Maximum target; lab confirmation required</td></tr><tr><td>Feed density</td><td>${design.inputs.density} kg/m³</td><td>Used for throughput and hydraulics</td></tr><tr><td>Water recovery</td><td>${design.massBalance.waterRecoveryPct}%</td><td>Mass-balance result</td></tr><tr><td>Heat-transfer area</td><td>${design.thermal.designAreaM2} m²</td><td>Includes preliminary allowance</td></tr><tr><td>MVR compressor</td><td>${design.thermal.compressorPowerKw} kW absorbed / ${design.thermal.compressorMotorKw} kW selected</td><td>${design.thermal.pressureRatio}:1 pressure ratio</td></tr><tr><td>Specific plant electricity</td><td>${design.thermal.specificPlantEnergyKwhT} kWh/t evaporation</td><td>MVR plus pump auxiliaries</td></tr></table><h2>Equipment architecture</h2><p>The concept includes feed balance storage, feed transfer and preheating, ${design.plantLayout.bodyTags.length} evaporator process train${design.plantLayout.bodyTags.length > 1 ? "s" : ""}, forced-circulation pumping, vapor-liquid separation, MVR compression, DCH/NCG handling, vacuum service, condensate collection, concentrate transfer, valves, instruments, platforms and maintainable access.</p><h2>Engineering notes and limitations</h2>${design.warnings.map((warning) => `<p class="note">${xmlEscape(warning)}</p>`).join("")}<div class="page-break"></div><header><div><div class="brand"><i></i>ENGINEERING DRAWING</div><b>Design deliverable register</b></div><div class="control">ED-MVR-BEP-001<br>Revision P01</div></header><h2>Package contents</h2><table><tr><th>Document</th><th>Title</th><th>Status</th></tr><tr><td>ED-MVR-CAL-001</td><td>Calculation workbook: basis, HMBD, equipment, pumps, lines, valves, instruments, utilities and cost</td><td>Preliminary</td></tr><tr><td>ED-MVR-PFD-001</td><td>Process flow diagram with stream heat and mass balance</td><td>Preliminary</td></tr><tr><td>ED-MVR-3D-001</td><td>Editable conceptual plant model (.OBJ)</td><td>Visualization</td></tr><tr><td>ED-MVR-EQL/LL/VL/IL</td><td>Controlled engineering schedules</td><td>Preliminary</td></tr><tr><td>ED-MVR-CE-001</td><td>Class 4 budgetary installed cost estimate</td><td>Budgetary</td></tr></table><h2>Issue statement</h2><p>This package is an original Engineering Drawing client deliverable generated from the stated simulation inputs. It contains no third-party project names, client records, reference drawing numbers or source-document provenance. Final guarantees, HAZOP, statutory design, vendor selections, fabrication drawings and commissioning require project-specific data and authorized engineering review.</p><div class="footer">Engineering Drawing · contact@engineeringdrawing.io · https://engineeringdrawing.io · Future support: quote ED-MVR-BEP-001.</div></body></html>`;
  void report;
  const equipmentRows = [["Tag", "Equipment", "Duty", "Material"], ...design.equipment.map((item) => [item.tag, item.name, item.duty, item.material])];
  const lineRows = [["Line", "Service", "Size", "Schedule", "Material", "Flow m3/h", "Velocity m/s"], ...design.lines.map((item) => [item.lineNo, item.service, item.size, item.schedule, item.material, item.flowM3h, item.velocity])];
  const valveRows = [["Tag", "Service", "Size", "Type", "Material"], ...design.valves.map((item) => [item.tag, item.service, item.size, item.type, item.material])];
  const pumpRows = [["Tag", "Service", "Flow m3/h", "Head m", "Absorbed kW", "Motor kW", "Material"], ...design.pumps.map((item) => [item.tag, item.service, item.flowM3h, item.headM, item.powerKw, item.motorKw, item.material])];
  const instrumentRows = [["Tag", "Service", "Type", "Range", "Function"], ...design.instruments.map((item) => [item.tag, item.service, item.type, item.range, item.function])];
  const utilityRows = [["Utility", "Design basis", "Estimated demand", "Engineering note"], ...design.utilities.map((item) => [item.utility, item.design, item.demand, item.note])];
  const costRows = [["Cost element", "USD", "INR"], ...design.cost.items.map((item) => [item.item, item.usd, Math.round(item.usd * design.cost.exchangeRateInrUsd)]), ["Contingency (15%)", design.cost.contingencyUsd, Math.round(design.cost.contingencyUsd * design.cost.exchangeRateInrUsd)], ["TOTAL INSTALLED COST", design.cost.totalInstalledUsd, design.cost.totalInstalledInr]];
  const documentControl = `ENGINEERING DRAWING
MVR EVAPORATOR PRELIMINARY BASIC ENGINEERING PACKAGE

Client: ${design.inputs.clientName}
Project: ${design.inputs.projectName}
Location: ${design.inputs.projectLocation}
Document number: ED-MVR-BEP-001
Revision: P01
Status: PRELIMINARY / NOT FOR CONSTRUCTION
Prepared by: Engineering Drawing
Checked / approved by: Pending licensed professional and vendor review

Future support: contact@engineeringdrawing.io | https://engineeringdrawing.io
Estimate basis: ${design.cost.accuracy}
Exclusions: ${design.cost.exclusions}

This package is issued for client review and budget development only. Final process guarantees, HAZOP, statutory design, vendor selections and fabrication drawings require project-specific laboratory data and authorized engineering approval.`;
  return makeZip({
    "00-document-index.txt": "ENGINEERING DRAWING · CONTROLLED MVR EVAPORATOR BEP\n00A-document-control.txt\n01-branded-design-report.html\n02-evaporator-calculation-workbook.xlsx\n03-process-flow-diagram.svg\n04-equipment-list.csv\n05-pump-schedule.csv\n06-line-list.csv\n07-valve-list.csv\n08-instrument-index.csv\n09-utility-summary.csv\n10-design-data.json\n11-concept-3d-model.obj\n12-budgetary-cost-estimate.csv",
    "00A-document-control.txt": documentControl,
    "01-branded-design-report.html": professionalReport,
    "02-evaporator-calculation-workbook.xlsx": workbook,
    "03-process-flow-diagram.svg": pfdSvg,
    "04-equipment-list.csv": csv(equipmentRows),
    "05-pump-schedule.csv": csv(pumpRows),
    "06-line-list.csv": csv(lineRows),
    "07-valve-list.csv": csv(valveRows),
    "08-instrument-index.csv": csv(instrumentRows),
    "09-utility-summary.csv": csv(utilityRows),
    "10-design-data.json": JSON.stringify(design, null, 2),
    "11-concept-3d-model.obj": conceptualObj(design),
    "12-budgetary-cost-estimate.csv": csv(costRows),
  });
}
