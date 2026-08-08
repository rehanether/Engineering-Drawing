const round = (value, digits = 2) => Number(Number(value || 0).toFixed(digits));
const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

const PIPE_TABLE = [
  { nps: '1"', idM: 0.026 }, { nps: '1½"', idM: 0.04 }, { nps: '2"', idM: 0.052 },
  { nps: '3"', idM: 0.077 }, { nps: '4"', idM: 0.102 }, { nps: '6"', idM: 0.154 },
];
const MOTORS = [0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75];

function pipeSize(flowM3H, maxVelocity = 1.8) {
  const flowM3S = Math.max(flowM3H, 0.02) / 3600;
  const selected = PIPE_TABLE.find(({ idM }) => flowM3S / (Math.PI * idM ** 2 / 4) <= maxVelocity) || PIPE_TABLE.at(-1);
  return { ...selected, velocityMS: round(flowM3S / (Math.PI * selected.idM ** 2 / 4), 2) };
}
function standardMotor(requiredKw) {
  return MOTORS.find((motor) => motor >= requiredKw) || Math.ceil(requiredKw / 5) * 5;
}

export const REACTOR_PRESETS = {
  pharma: {
    label: "Pharmaceutical API intermediate (illustrative)", badge: "1 m³ batch",
    summary: "8 h cycle · 90% conversion · jacketed SS316L vessel",
    note: "Reference feed for a solvent-based pharmaceutical intermediate",
    type: "Batch", capacity: 1, concentrationMolM3: 850, conversionPct: 90, reactionOrder: 1,
    rateConstant: 0.0008, batchTimeH: 8, feedTempC: 25, reactorTempC: 65,
    densityKgM3: 950, cpKjKgK: 2.8, heatReactionKjMol: -85, viscosityCp: 5,
    molecularWeightA: 180, purityAPct: 98, molecularWeightB: 102, purityBPct: 99,
    stoichBPerA: 1.05, solventMassPct: 72, overallU: 400, utilityInC: 20,
    utilityOutC: 30, moc: "SS316L", volatileService: true, cipRequired: true,
  },
  fineChemical: {
    label: "General fine chemical synthesis", badge: "1 m³ batch",
    summary: "8 h cycle · 85% conversion · volatile solvent service",
    note: "Flexible multipurpose fine-chemical batch reference",
    type: "Batch", capacity: 1, concentrationMolM3: 1000, conversionPct: 85, reactionOrder: 1,
    rateConstant: 0.0012, batchTimeH: 8, feedTempC: 30, reactorTempC: 75,
    densityKgM3: 1000, cpKjKgK: 3.2, heatReactionKjMol: -65, viscosityCp: 12,
    molecularWeightA: 150, purityAPct: 95, molecularWeightB: 75, purityBPct: 98,
    stoichBPerA: 1, solventMassPct: 60, overallU: 450, utilityInC: 25,
    utilityOutC: 35, moc: "SS316L", volatileService: true, cipRequired: false,
  },
  aqueous: {
    label: "Aqueous reaction / neutralization", badge: "1 m³/h",
    summary: "Continuous CSTR · 95% conversion · aqueous duty",
    note: "Reference feed for a continuous aqueous neutralization system",
    type: "CSTR", capacity: 1, concentrationMolM3: 700, conversionPct: 95, reactionOrder: 1,
    rateConstant: 0.003, batchTimeH: 6, feedTempC: 25, reactorTempC: 40,
    densityKgM3: 1030, cpKjKgK: 4, heatReactionKjMol: -55, viscosityCp: 2,
    molecularWeightA: 98, purityAPct: 90, molecularWeightB: 40, purityBPct: 95,
    stoichBPerA: 1.02, solventMassPct: 80, overallU: 550, utilityInC: 20,
    utilityOutC: 30, moc: "SS316L", volatileService: false, cipRequired: false,
  },
};

export function calculateReactorDesign(raw) {
  const inputs = {
    preset: raw.preset || "pharma",
    type: ["Batch", "CSTR", "PFR"].includes(raw.type) ? raw.type : "Batch",
    capacity: Math.round(clamp(raw.capacity, 1, 5)),
    concentrationMolM3: clamp(raw.concentrationMolM3, 10, 5000),
    conversionPct: clamp(raw.conversionPct, 10, 99),
    reactionOrder: clamp(raw.reactionOrder, 0.5, 2),
    rateConstant: clamp(raw.rateConstant, 0.000001, 1),
    batchTimeH: clamp(raw.batchTimeH, 1, 24),
    feedTempC: clamp(raw.feedTempC, 5, 180), reactorTempC: clamp(raw.reactorTempC, 10, 220),
    densityKgM3: clamp(raw.densityKgM3, 650, 1600), cpKjKgK: clamp(raw.cpKjKgK, 1, 5),
    heatReactionKjMol: clamp(raw.heatReactionKjMol, -500, 500), viscosityCp: clamp(raw.viscosityCp, 0.3, 5000),
    molecularWeightA: clamp(raw.molecularWeightA, 10, 1000), purityAPct: clamp(raw.purityAPct, 1, 100),
    molecularWeightB: clamp(raw.molecularWeightB, 10, 1000), purityBPct: clamp(raw.purityBPct, 1, 100),
    stoichBPerA: clamp(raw.stoichBPerA, 0, 5), solventMassPct: clamp(raw.solventMassPct, 0, 95),
    overallU: clamp(raw.overallU, 100, 1500), utilityInC: clamp(raw.utilityInC, 0, 210),
    utilityOutC: clamp(raw.utilityOutC, 1, 220), moc: raw.moc || "SS316L",
    volatileService: raw.volatileService !== false, cipRequired: raw.cipRequired !== false,
    projectName: raw.projectName || "Pharmaceutical Reaction System", clientName: raw.clientName || "Client / End User",
  };

  const x = inputs.conversionPct / 100;
  const ca0 = inputs.concentrationMolM3;
  const ca = Math.max(0.001, ca0 * (1 - x));
  const nominalVolume = inputs.capacity;
  const feedVolumeM3H = inputs.type === "Batch" ? nominalVolume / inputs.batchTimeH : nominalVolume;
  const feedMassKgH = feedVolumeM3H * inputs.densityKgM3;
  const aMolesKmolH = feedVolumeM3H * ca0 / 1000;
  const aPureKgH = aMolesKmolH * inputs.molecularWeightA;
  const aAsChargedKgH = aPureKgH / (inputs.purityAPct / 100);
  const bPureKgH = aMolesKmolH * inputs.stoichBPerA * inputs.molecularWeightB;
  const bAsChargedKgH = bPureKgH / (inputs.purityBPct / 100);
  const solventKgH = feedMassKgH * inputs.solventMassPct / 100;
  const otherCarrierKgH = Math.max(0, feedMassKgH - aAsChargedKgH - solventKgH);
  const totalInKgH = feedMassKgH + bAsChargedKgH;
  const productKgH = totalInKgH;
  const reactedAKmolH = aMolesKmolH * x;

  const k = inputs.rateConstant, n = inputs.reactionOrder, flowM3S = feedVolumeM3H / 3600;
  let processVolumeM3, residenceTimeH, batchReactionTimeH = inputs.batchTimeH;
  if (inputs.type === "CSTR") {
    const rate = k * ca ** n;
    processVolumeM3 = flowM3S * ca0 * x / Math.max(rate, 1e-9);
    residenceTimeH = processVolumeM3 / feedVolumeM3H;
  } else if (inputs.type === "PFR") {
    const integral = Math.abs(n - 1) < 1e-6 ? Math.log(1 / (1 - x)) : ((1 - x) ** (1 - n) - 1) / (n - 1);
    processVolumeM3 = flowM3S * integral / Math.max(k * ca0 ** (n - 1), 1e-9);
    residenceTimeH = processVolumeM3 / feedVolumeM3H;
  } else {
    processVolumeM3 = nominalVolume;
    batchReactionTimeH = Math.abs(n - 1) < 1e-6
      ? Math.log(1 / (1 - x)) / Math.max(k, 1e-9) / 3600
      : (((ca ** (1 - n)) - (ca0 ** (1 - n))) / Math.max((n - 1) * k, 1e-9)) / 3600;
    residenceTimeH = inputs.batchTimeH;
  }
  processVolumeM3 = clamp(processVolumeM3, 0.15, 80);
  const designVolumeM3 = processVolumeM3 / 0.8;
  const diameterM = (4 * designVolumeM3 / (Math.PI * 1.25)) ** (1 / 3);
  const straightHeightM = diameterM * 1.25, totalHeightM = straightHeightM + diameterM * 0.55;
  const reactionDutyKw = reactedAKmolH * 1000 / 3600 * Math.abs(inputs.heatReactionKjMol);
  const sensibleKw = totalInKgH / 3600 * inputs.cpKjKgK * (inputs.reactorTempC - inputs.feedTempC);
  const signedDutyKw = inputs.heatReactionKjMol < 0 ? sensibleKw - reactionDutyKw : sensibleKw + reactionDutyKw;
  const designDutyKw = Math.abs(signedDutyKw) * 1.2;
  const approach1 = Math.max(3, Math.abs(inputs.reactorTempC - inputs.utilityInC));
  const approach2 = Math.max(3, Math.abs(inputs.reactorTempC - inputs.utilityOutC));
  const lmtd = Math.abs(approach1 - approach2) < 0.01 ? approach1 : Math.abs((approach1 - approach2) / Math.log(approach1 / approach2));
  const heatAreaM2 = round(designDutyKw * 1000 / (inputs.overallU * Math.max(lmtd, 3)), 2);
  const agitationIntensity = inputs.viscosityCp > 1000 ? 2.2 : inputs.viscosityCp > 100 ? 1.6 : 1.1;
  const agitatorAbsorbedKw = inputs.type === "PFR" ? 0 : round(processVolumeM3 * agitationIntensity, 2);
  const agitatorMotorKw = inputs.type === "PFR" ? 0 : standardMotor(agitatorAbsorbedKw * 1.25);
  const feedPumpKw = standardMotor(Math.max(0.75, feedVolumeM3H * 0.55));
  const dosingPumpKw = standardMotor(Math.max(0.75, bAsChargedKgH / inputs.densityKgM3 * 0.8));
  const utilityFlowM3H = round(designDutyKw / (4.18 * Math.max(3, Math.abs(inputs.utilityOutC - inputs.utilityInC))) * 3.6, 2);
  const utilityPumpKw = standardMotor(Math.max(0.75, utilityFlowM3H * 0.18));
  const connectedLoadKw = round(agitatorMotorKw + feedPumpKw + dosingPumpKw + utilityPumpKw + (inputs.volatileService ? 2.2 : 1.2), 2);
  const productionM3Day = inputs.type === "Batch" ? nominalVolume * Math.floor(24 / inputs.batchTimeH) : nominalVolume * 24;
  const line = pipeSize(feedVolumeM3H), dosingLine = pipeSize(Math.max(bAsChargedKgH / inputs.densityKgM3, .03), 1.2);
  const utilityLine = pipeSize(Math.max(utilityFlowM3H, .2), 2.2);
  const baseEquipmentUsd = inputs.type === "PFR" ? 160000 : 135000;
  const installedUsd = Math.round((baseEquipmentUsd + designVolumeM3 * 44000 + heatAreaM2 * 2500 + connectedLoadKw * 1700 + (inputs.cipRequired ? 18000 : 0) + (inputs.volatileService ? 24000 : 0)) * 1.35);
  const layoutScale = 1 + (inputs.capacity - 1) * .1;
  const warnings = [];
  if (batchReactionTimeH > inputs.batchTimeH) warnings.push("Calculated kinetic time exceeds the batch cycle. Verify kinetics, temperature and cycle schedule.");
  if (Math.abs(inputs.heatReactionKjMol) > 100 || designDutyKw > 150) warnings.push("Thermal hazard screening, reaction calorimetry, emergency relief and runaway analysis are mandatory before design freeze.");
  if (aAsChargedKgH + solventKgH > feedMassKgH * 1.02) warnings.push("Component A plus solvent exceeds the carrier feed mass. Correct concentration, molecular weight or solvent fraction.");
  if (inputs.conversionPct > 95) warnings.push("Conversion above 95% requires verified kinetics, selectivity and impurity data.");
  if (inputs.viscosityCp > 500) warnings.push("High viscosity requires rheology data and vendor mixing trials.");
  if (inputs.volatileService) warnings.push("Volatile-service condenser and vent treatment are preliminary; provide vapor pressure, solvent composition and emissions basis.");
  const advisor = [
    `${inputs.type} selected for ${inputs.type === "Batch" ? "recipe flexibility, controlled dosing and batch traceability" : inputs.type === "CSTR" ? "steady continuous production" : "high-throughput tubular reaction"}.`,
    `${inputs.stoichBPerA.toFixed(2)} mol B/mol A requires approximately ${round(bAsChargedKgH, 1)} kg/h reagent solution.`,
    signedDutyKw < 0 ? `Net cooling service: remove ${round(Math.abs(signedDutyKw), 1)} kW before design margin.` : `Net heating service: supply ${round(signedDutyKw, 1)} kW before design margin.`,
    inputs.cipRequired ? "CIP return, spray device and drainability are included as pharmaceutical design allowances." : "Confirm cleaning philosophy and cross-contamination controls.",
  ];
  return {
    inputs,
    process: {
      processVolumeM3: round(processVolumeM3, 3), designVolumeM3: round(designVolumeM3, 3),
      residenceTimeH: round(residenceTimeH, 3), batchReactionTimeH: round(batchReactionTimeH, 3),
      feedVolumeM3H: round(feedVolumeM3H, 3), feedKgH: round(feedMassKgH, 1), productKgH: round(productKgH, 1),
      outletConcentrationMolM3: round(ca, 1), conversionPct: inputs.conversionPct, productionM3Day: round(productionM3Day, 1),
      balanceClosureKgH: round(totalInKgH - productKgH, 3),
    },
    components: {
      aPureKgH: round(aPureKgH, 1), aAsChargedKgH: round(aAsChargedKgH, 1), aReactedKmolH: round(reactedAKmolH, 3),
      bPureKgH: round(bPureKgH, 1), bAsChargedKgH: round(bAsChargedKgH, 1),
      solventKgH: round(solventKgH, 1), otherCarrierKgH: round(otherCarrierKgH, 1), totalInKgH: round(totalInKgH, 1),
    },
    geometry: { diameterM: round(diameterM, 2), straightHeightM: round(straightHeightM, 2), totalHeightM: round(totalHeightM, 2) },
    thermal: {
      reactionDutyKw: round(reactionDutyKw, 2), sensibleKw: round(sensibleKw, 2), netDutyKw: round(signedDutyKw, 2),
      totalDutyKw: round(designDutyKw, 2), service: signedDutyKw < 0 ? "Cooling" : "Heating",
      lmtdK: round(lmtd, 2), heatAreaM2, utilityFlowM3H,
    },
    mechanical: { agitatorAbsorbedKw, agitatorMotorKw, feedPumpKw, dosingPumpKw, utilityPumpKw, connectedLoadKw, moc: inputs.moc },
    piping: { process: line, dosing: dosingLine, utility: utilityLine },
    cost: { installedUsd, installedInr: Math.round(installedUsd * 84), accuracy: "AACE Class 4 preliminary estimate (typically -30% / +50%)" },
    layout: {
      lengthM: round((inputs.type === "PFR" ? 19 : 16) * layoutScale, 1), widthM: round(10 * layoutScale, 1),
      heightM: round(Math.max(7, totalHeightM + 2.8), 1), equipmentCount: inputs.capacity >= 4 ? 13 : 11,
    },
    advisor, warnings,
  };
}
