import { makeZip } from "../evaporator/downloadPackage";

const csv = (rows) => rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");

export function createReactorPackage(design, pfdSvg) {
  const d = design;
  const stamp = new Date().toISOString().slice(0, 10);
  const cover = `<!doctype html><html><head><meta charset="utf-8"><title>Reactor BEP</title><style>
  body{font-family:Arial;color:#172238;margin:42px}header{border-bottom:5px solid #6847f5;padding-bottom:18px}h1{margin:6px 0}.mark{color:#6847f5;font-weight:900;letter-spacing:.12em}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{border:1px solid #cfd6e2;padding:8px;text-align:left}.warn{background:#fff5d8;padding:12px;border-left:5px solid #dda820}footer{margin-top:40px;border-top:1px solid #ccc;padding-top:10px;font-size:11px}</style></head><body>
  <header><div class="mark">ENGINEERING DRAWING</div><h1>Preliminary Reactor Basic Engineering Package</h1><div>Document ED-RX-BEP-001 · Rev 00 · ${stamp}</div></header>
  <h2>${d.inputs.projectName}</h2><table><tr><th>Client</th><td>${d.inputs.clientName}</td><th>Process</th><td>${d.inputs.type}</td></tr>
  <tr><th>Capacity</th><td>${d.inputs.capacity} ${d.inputs.type === "Batch" ? "m³/batch" : "m³/h"}</td><th>Design volume</th><td>${d.process.designVolumeM3} m³</td></tr>
  <tr><th>Feed</th><td>${d.process.feedKgH} kg/h</td><th>Product</th><td>${d.process.productKgH} kg/h</td></tr>
  <tr><th>Thermal service</th><td>${d.thermal.service}, ${d.thermal.totalDutyKw} kW design</td><th>Heat-transfer area</th><td>${d.thermal.heatAreaM2} m²</td></tr></table>
  <h2>Calculation-led engineering review</h2><ul>${d.advisor.map((item) => `<li>${item}</li>`).join("")}</ul>
  <div class="warn"><b>PRELIMINARY / NOT FOR CONSTRUCTION.</b> Final kinetics, reaction calorimetry, relief/runaway analysis, materials compatibility, GMP validation, HAZOP, statutory and code design require authorized professional review.</div>
  <footer>Engineering Drawing · www.engineeringdrawing.io · Controlled client concept document</footer></body></html>`;
  const basisRows = [
    ["ENGINEERING DRAWING - REACTOR FEED BASIS", "", ""], ["Parameter", "Value", "Unit"],
    ["Reactor type", d.inputs.type, ""], ["Capacity", d.inputs.capacity, d.inputs.type === "Batch" ? "m3/batch" : "m3/h"],
    ["Feed volume", d.process.feedVolumeM3H, "m3/h"], ["Feed mass", d.process.feedKgH, "kg/h"],
    ["Component A charged", d.components.aAsChargedKgH, "kg/h"], ["Reagent B charged", d.components.bAsChargedKgH, "kg/h"],
    ["Solvent", d.components.solventKgH, "kg/h"], ["Product", d.process.productKgH, "kg/h"],
    ["Balance closure", d.process.balanceClosureKgH, "kg/h"], ["Conversion", d.inputs.conversionPct, "%"],
    ["Net duty", d.thermal.netDutyKw, "kW"], ["Design duty", d.thermal.totalDutyKw, "kW"],
  ];
  const equipmentRows = [
    ["Tag","Equipment","Key duty / size","Material"], ["TK-101","Feed tank",`${d.process.feedVolumeM3H} m3/h basis`,d.inputs.moc],
    ["TK-103","Reagent dosing tank",`${d.components.bAsChargedKgH} kg/h basis`,d.inputs.moc],
    ["R-101",`${d.inputs.type} reactor`,`${d.process.designVolumeM3} m3 design`,d.inputs.moc],
    ["A-101","Agitator",`${d.mechanical.agitatorMotorKw} kW motor`,d.inputs.moc],
    ["E-101","Jacket / coil",`${d.thermal.heatAreaM2} m2`,d.inputs.moc],
    ["E-102","Vent condenser",d.inputs.volatileService ? "Included - vendor sizing required" : "Not selected",d.inputs.moc],
    ["CU-101","Utility skid",`${d.thermal.utilityFlowM3H} m3/h`,"Vendor standard"],
    ["CIP-101","CIP skid",d.inputs.cipRequired ? "Included" : "Optional","SS316L"],
  ];
  const linesRows = [
    ["Line","Service","Size","Velocity"],["L-101","Main feed",d.piping.process.nps,`${d.piping.process.velocityMS} m/s`],
    ["L-102","Reagent dosing",d.piping.dosing.nps,`${d.piping.dosing.velocityMS} m/s`],
    ["L-201","Thermal utility",d.piping.utility.nps,`${d.piping.utility.velocityMS} m/s`],
  ];
  const json = JSON.stringify(d, null, 2);
  const obj = `# ENGINEERING DRAWING preliminary reactor envelope\n` +
    [[0,0,0],[d.layout.lengthM,0,0],[d.layout.lengthM,0,d.layout.widthM],[0,0,d.layout.widthM],
     [0,d.layout.heightM,0],[d.layout.lengthM,d.layout.heightM,0],[d.layout.lengthM,d.layout.heightM,d.layout.widthM],[0,d.layout.heightM,d.layout.widthM]]
      .map((v) => `v ${v.join(" ")}`).join("\n") + "\n";
  return makeZip({
    "00_README.txt": "ENGINEERING DRAWING\nPreliminary reactor BEP. Open the HTML report in a browser and CSV schedules in Excel. NOT FOR CONSTRUCTION.",
    "01_Controlled_Reactor_Report.html": cover,
    "02_Reactor_PFD.svg": pfdSvg,
    "03_Feed_Basis_and_HMBD.csv": csv(basisRows),
    "04_Equipment_Schedule.csv": csv(equipmentRows),
    "05_Line_and_Valve_Basis.csv": csv(linesRows),
    "06_Design_Data.json": json,
    "07_Concept_Plant_Envelope.obj": obj,
  });
}
