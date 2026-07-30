const PIPE_SIZES = [
  { dn: 15, od: 21.3, id: 16.1 }, { dn: 20, od: 26.7, id: 21.7 },
  { dn: 25, od: 33.4, id: 27.3 }, { dn: 32, od: 42.2, id: 36.0 },
  { dn: 40, od: 48.3, id: 41.9 }, { dn: 50, od: 60.3, id: 52.5 },
  { dn: 65, od: 73.0, id: 62.7 }, { dn: 80, od: 88.9, id: 77.9 },
  { dn: 100, od: 114.3, id: 102.3 }, { dn: 125, od: 141.3, id: 128.2 },
  { dn: 150, od: 168.3, id: 154.1 }, { dn: 200, od: 219.1, id: 202.7 },
  { dn: 250, od: 273.0, id: 254.5 }, { dn: 300, od: 323.9, id: 303.2 },
  { dn: 350, od: 355.6, id: 333.4 }, { dn: 400, od: 406.4, id: 381.0 },
  { dn: 450, od: 457.0, id: 428.0 }, { dn: 500, od: 508.0, id: 477.0 },
  { dn: 600, od: 610.0, id: 575.0 }, { dn: 700, od: 711.0, id: 670.0 },
  { dn: 800, od: 813.0, id: 766.0 }, { dn: 900, od: 914.0, id: 862.0 },
  { dn: 1000, od: 1016.0, id: 958.0 },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || min));
const round = (value, digits = 2) => Number(Number(value).toFixed(digits));
const STANDARD_MOTORS_KW = [0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110];
const selectMotor = (absorbedKw, margin = 1.15) => STANDARD_MOTORS_KW.find((kw) => kw >= absorbedKw * margin) || round(absorbedKw * margin, 1);

function waterSaturationPressureKpa(tempC) {
  return Math.pow(10, 8.07131 - 1730.63 / (233.426 + tempC)) * 0.133322;
}

function mvrCompression(evaporationKgH, suctionTempC, heatLiftK, efficiency) {
  const inletK = suctionTempC + 273.15;
  const suctionPressureKpa = waterSaturationPressureKpa(suctionTempC);
  const dischargePressureKpa = waterSaturationPressureKpa(suctionTempC + heatLiftK);
  const pressureRatio = dischargePressureKpa / suctionPressureKpa;
  const isentropicOutletK = inletK * Math.pow(pressureRatio, (1.33 - 1) / 1.33);
  const specificWorkKjKg = 1.9 * (isentropicOutletK - inletK) / efficiency;
  const absorbedKw = evaporationKgH / 3600 * specificWorkKjKg;
  return {
    suctionPressureKpa: round(suctionPressureKpa),
    dischargePressureKpa: round(dischargePressureKpa),
    pressureRatio: round(pressureRatio, 3),
    specificWorkKjKg: round(specificWorkKjKg),
    absorbedKw: round(absorbedKw),
    motorKw: selectMotor(absorbedKw, 1.1),
  };
}

function selectLine(flowM3h, targetVelocity, service) {
  const flowM3s = Math.max(flowM3h, 0.001) / 3600;
  const selected = PIPE_SIZES.find((pipe) => {
    const area = Math.PI * Math.pow(pipe.id / 1000, 2) / 4;
    return flowM3s / area <= targetVelocity;
  }) || PIPE_SIZES[PIPE_SIZES.length - 1];
  const area = Math.PI * Math.pow(selected.id / 1000, 2) / 4;
  return {
    service,
    size: `DN${selected.dn}`,
    schedule: "Sch 10S",
    material: "SS 316L",
    flowM3h: round(flowM3h),
    velocity: round(flowM3s / area),
  };
}

function pump(tag, service, flowM3h, headM, efficiency = 0.62) {
  const power = (1000 * 9.81 * (flowM3h / 3600) * headM) / Math.max(efficiency, 0.2) / 1000;
  const absorbedKw = Math.max(0.05, power);
  return {
    tag, service,
    flowM3h: round(flowM3h),
    headM: round(headM, 1),
    efficiency: round(efficiency * 100, 1),
    powerKw: round(absorbedKw, 2),
    motorKw: selectMotor(absorbedKw),
    material: "SS 316L wetted parts",
  };
}

export function calculateEvaporatorDesign(raw = {}) {
  const capacityTph = Math.round(clamp(raw.capacityTph ?? raw.capacityTpd, 1, 5));
  const operatingHours = clamp(raw.operatingHours || 24, 16, 24);
  const density = clamp(raw.density || 1000, 850, 1400);
  const feedConc = clamp(raw.feedConc || 2, 0.2, 35);
  const finalConc = clamp(raw.finalConc || 15, feedConc + 0.5, 60);
  const feedTemp = clamp(raw.feedTemp || 30, 5, 85);
  const boilingTemp = clamp(raw.boilingTemp || 60, Math.max(feedTemp + 5, 45), 90);
  const heatLift = clamp(raw.heatLift || 8, 5, 15);
  const compressorEfficiency = clamp(raw.compressorEfficiency || 75, 55, 85) / 100;
  const uValue = clamp(raw.uValue || 1500, 650, 2500);
  const recovery = clamp(raw.heatRecovery || 90, 70, 96) / 100;
  const cp = 4.0;
  const latentKjKg = 2358;
  const feedKgH = capacityTph * 1000;
  const dailyThroughputTpd = capacityTph * operatingHours;
  const solidsKgH = feedKgH * feedConc / 100;
  const productKgH = solidsKgH / (finalConc / 100);
  const evaporationKgH = Math.max(0, feedKgH - productKgH);
  const feedM3h = feedKgH / density;
  const dailyFeedKld = feedM3h * operatingHours;
  const productM3h = productKgH / Math.max(density * 1.05, 1);
  const condensateM3h = evaporationKgH / 985;
  const concentrationRatio = finalConc / feedConc;
  const waterRecoveryPct = feedKgH > 0 ? evaporationKgH / feedKgH * 100 : 0;
  const tdsLoadKgDay = solidsKgH * operatingHours;
  const rejectLDay = productM3h * operatingHours * 1000;
  const sensibleKw = feedKgH * cp * Math.max(boilingTemp - feedTemp, 0) / 3600;
  const latentKw = evaporationKgH * latentKjKg / 3600;
  const externalHeatKw = sensibleKw + latentKw * (1 - recovery);
  const areaM2 = (sensibleKw + latentKw) / Math.max(uValue * heatLift / 1000, 0.1);
  const designAreaM2 = areaM2 * 1.2;
  const compression = mvrCompression(evaporationKgH, boilingTemp, heatLift, compressorEfficiency);
  const recirculationM3h = Math.max(feedM3h * 5, evaporationKgH / 1000 * 250);
  const vaporSpecificVolumeM3Kg = 0.4615 * (boilingTemp + 273.15) / waterSaturationPressureKpa(boilingTemp);
  const vaporVolumeM3h = evaporationKgH * vaporSpecificVolumeM3Kg;
  const separatorDiameterM = Math.max(0.45, Math.sqrt((vaporVolumeM3h / 3600) / (0.8 * Math.PI / 4)));
  const separatorHeightM = Math.max(1.8, separatorDiameterM * 3.2);
  const calandriaDiameterM = Math.max(0.5, Math.sqrt(designAreaM2 / (Math.PI * 4.0 * 0.65)));
  const calandriaHeightM = Math.max(2.0, calandriaDiameterM * 3.5);
  const feedTankM3 = Math.max(0.5, feedM3h * 2);
  const productTankM3 = Math.max(0.3, productM3h * 4);
  const condensateTankM3 = Math.max(0.5, condensateM3h * 2);

  const pumps = [
    pump("P-106 A/B", "Wastewater feed", feedM3h * 1.15, 22),
    pump("P-101 A/B", "Forced circulation", recirculationM3h, 28, 0.68),
    pump("P-107", "Concentrate / reject", Math.max(productM3h * 1.25, 0.4), 20),
    pump("P-105", "Condensate transfer", Math.max(condensateM3h * 1.2, 0.5), 18),
    pump("P-104", "Vacuum / NCG service", Math.max(condensateM3h * 0.3, 0.35), 25),
  ];
  const auxiliaryAbsorbedKw = pumps.reduce((sum, item) => sum + item.powerKw, 0);
  const auxiliaryConnectedKw = pumps.reduce((sum, item) => sum + item.motorKw, 0);
  const totalAbsorbedKw = compression.absorbedKw + auxiliaryAbsorbedKw;
  const totalConnectedKw = compression.motorKw + auxiliaryConnectedKw;
  const specificCompressionKwhT = evaporationKgH > 0 ? compression.absorbedKw / (evaporationKgH / 1000) : 0;
  const specificPlantKwhT = evaporationKgH > 0 ? totalAbsorbedKw / (evaporationKgH / 1000) : 0;
  const directEquipmentUsd =
    18000 + designAreaM2 * 1450 + (feedTankM3 + productTankM3 + condensateTankM3) * 4200 +
    compression.motorKw * 1850 + pumps.reduce((sum, item) => sum + 1100 + item.motorKw * 650, 0);
  const costItems = [
    ["Process equipment and vessels", directEquipmentUsd],
    ["Piping, valves and insulation", directEquipmentUsd * 0.24],
    ["Instrumentation and automation", directEquipmentUsd * 0.12],
    ["Electrical, MCC and cabling", directEquipmentUsd * 0.1],
    ["Structure, platform and access", directEquipmentUsd * 0.14],
    ["Installation and commissioning", directEquipmentUsd * 0.2],
    ["Engineering and documentation", directEquipmentUsd * 0.08],
  ].map(([item, usd]) => ({ item, usd: round(usd, 0) }));
  const subtotalUsd = costItems.reduce((sum, item) => sum + item.usd, 0);
  const contingencyUsd = subtotalUsd * 0.15;
  const totalInstalledUsd = subtotalUsd + contingencyUsd;
  const exchangeRateInrUsd = clamp(raw.exchangeRateInrUsd || 84, 60, 120);

  const lines = [
    selectLine(feedM3h * 1.15, 1.5, "Feed"),
    selectLine(recirculationM3h, 2.2, "Forced circulation"),
    selectLine(Math.max(productM3h * 1.25, 0.4), 1.2, "Concentrate"),
    selectLine(Math.max(condensateM3h * 1.2, 0.5), 1.8, "Condensate"),
    selectLine(Math.max(vaporVolumeM3h, 10), 18, "Vapor"),
  ].map((line, index) => ({ ...line, lineNo: `L-${101 + index}` }));

  const referenceLayouts = {
    1: { basis: "Single-train MVR process configuration", bodyTags: ["EV-101"], heaterTags: ["E-101"], recirculationPumps: 1, boosterCount: 1, blowerCount: 0, ga: { lengthM: 3.4, widthM: 3.0, heightM: 6.2 } },
    2: { basis: "Dual-train MVR process configuration", bodyTags: ["EV-101", "EV-102"], heaterTags: ["E-101", "E-102"], recirculationPumps: 2, boosterCount: 2, blowerCount: 0, ga: { lengthM: 4.2, widthM: 3.1, heightM: 7.2 } },
    3: { basis: "Three-train MVR process configuration", bodyTags: ["EV-101", "EV-102", "EV-103"], heaterTags: ["E-101", "E-102", "E-103"], recirculationPumps: 3, boosterCount: 2, blowerCount: 1, ga: { lengthM: 4.65, widthM: 3.1, heightM: 8.15 } },
    4: { basis: "Four-train modular MVR process configuration", bodyTags: ["EV-101", "EV-102", "EV-103", "EV-104"], heaterTags: ["E-101", "E-102", "E-103", "E-104"], recirculationPumps: 4, boosterCount: 2, blowerCount: 1, ga: { lengthM: 6.2, widthM: 3.4, heightM: 8.4 } },
    5: { basis: "Five-train modular MVR process configuration", bodyTags: ["EV-101", "EV-102", "EV-103", "EV-104", "EV-105"], heaterTags: ["E-101", "E-102", "E-103", "E-104", "E-105"], recirculationPumps: 5, boosterCount: 2, blowerCount: 1, ga: { lengthM: 7.7, widthM: 3.6, heightM: 8.8 } },
  };
  const plantLayout = referenceLayouts[capacityTph];

  const equipment = [
    { tag: "TK-101", name: "Feed balance tank", duty: `${round(feedTankM3)} m³ working volume`, material: "SS 316L" },
    { tag: "E-101", name: "Feed preheater", duty: `${round(sensibleKw)} kW / ${round(Math.max(1, sensibleKw / 18))} m²`, material: "SS 316L tubes" },
    ...plantLayout.bodyTags.map((tag, index) => ({ tag, name: index === plantLayout.bodyTags.length - 1 && capacityTph >= 3 ? "Finisher / vapor-liquid body" : `Evaporator body ${index + 1}`, duty: `${round(designAreaM2 / plantLayout.bodyTags.length)} m² allocated area`, material: "SS 316L" })),
    ...plantLayout.heaterTags.map((tag, index) => ({ tag, name: `Shell-and-tube heater ${index + 1}`, duty: `${round(designAreaM2 / plantLayout.heaterTags.length)} m² allocated area`, material: "SS 316L tubes" })),
    { tag: "B-101", name: "MVR booster / compressor", duty: `${compression.absorbedKw} kW absorbed / ${compression.motorKw} kW motor`, material: "Duplex/SS wetted" },
    { tag: "E-102", name: "Direct contact heater / NCG condenser", duty: "Vacuum stabilization and NCG cooling", material: "SS 316L" },
    { tag: "TK-111", name: "Condensate tank", duty: `${round(condensateTankM3)} m³ working volume`, material: "SS 304" },
    { tag: "TK-103", name: "Product tank", duty: `${round(productTankM3)} m³ working volume`, material: "SS 316L" },
    ...pumps.map((item) => ({ tag: item.tag, name: item.service, duty: `${item.flowM3h} m³/h @ ${item.headM} m / ${item.motorKw} kW motor`, material: item.material })),
  ];

  const valves = [
    ["XV-101", "Feed isolation", lines[0].size, "Ball valve"],
    ["FCV-101", "Feed flow control", lines[0].size, "Globe control valve"],
    ["NRV-102", "Circulation pump discharge", lines[1].size, "Swing check valve"],
    ["PCV-101", "MVR discharge pressure control", lines[4].size, "Butterfly control valve"],
    ["LCV-101", "Separator level control", lines[2].size, "Globe control valve"],
    ["PSV-101", "Separator overpressure protection", "DN25", "Safety relief valve"],
    ["XV-104", "Condensate isolation", lines[3].size, "Ball valve"],
  ].map(([tag, service, size, type]) => ({ tag, service, size, type, material: "SS 316L" }));

  const instruments = [
    { tag: "FIT-101", service: "Feed flow", type: "Magnetic flow transmitter", range: `0-${round(feedM3h * 1.5, 1)} m³/h`, function: "Feed flow indication and control" },
    { tag: "FIT-102", service: "Condensate flow", type: "Magnetic / vortex flow transmitter", range: `0-${round(condensateM3h * 1.5, 1)} m³/h`, function: "Distillate production monitoring" },
    { tag: "LIT-101", service: "Evaporator body level", type: "DP / guided-wave radar", range: "0-100 %", function: "Level control and pump protection" },
    { tag: "PIT-101", service: "MVR suction", type: "Absolute pressure transmitter", range: "0-150 kPa abs", function: "Vacuum and compressor protection" },
    { tag: "PIT-102", service: "MVR discharge", type: "Absolute pressure transmitter", range: "0-250 kPa abs", function: "Pressure-ratio control" },
    { tag: "TIT-101", service: "Feed inlet", type: "RTD Pt100", range: "0-120 °C", function: "Sensible-duty monitoring" },
    { tag: "TIT-102", service: "Boiling liquor", type: "RTD Pt100", range: "0-120 °C", function: "Boiling-temperature control" },
    { tag: "TIT-103", service: "MVR discharge vapor", type: "RTD Pt100", range: "0-160 °C", function: "High-temperature trip" },
    { tag: "AIT-101", service: "Concentrate", type: "Conductivity / density analyzer", range: "Project specific", function: "Endpoint monitoring; lab correlation required" },
  ];

  const utilities = [
    { utility: "Electrical supply", design: "380-415 V, 3 phase, 50 Hz", demand: `${round(totalConnectedKw)} kW connected`, note: "Confirm site fault level and motor starting philosophy" },
    { utility: "Start-up steam", design: "Saturated steam, nominal 6 barg", demand: `${round(externalHeatKw * 1.15 / 0.58)} kg/h estimated`, note: "Intermittent/start-up duty; vendor to confirm" },
    { utility: "Cooling water", design: "30 °C supply / 38 °C return basis", demand: `${round(Math.max(1, condensateM3h * 1.5), 1)} m³/h`, note: "DCH, vacuum and seal cooling basis" },
    { utility: "Instrument air", design: "6 barg, clean and dry", demand: `${round(6 + capacityTph * 2)} Nm³/h`, note: "Control valves and pneumatic services" },
    { utility: "CIP / wash water", design: "Client quality standard", demand: "Batch / intermittent", note: "Chemistry depends on scaling and wastewater composition" },
  ];

  const warnings = [];
  if (finalConc > 35) warnings.push("High final concentration: viscosity and heat-transfer degradation require pilot data.");
  if (feedConc < 1) warnings.push("Very dilute feed: verify COD/TDS and achievable concentrate specification.");
  if (boilingTemp - feedTemp < 10) warnings.push("Low sensible-heating range; confirm feed temperature and preheater duty.");
  warnings.push(`The ${finalConc}% maximum design concentration is a process limit input, not a prediction; confirm salt composition, solubility curve, viscosity, BPE, COD and scaling tendency from laboratory data.`);
  warnings.push("Concept sizing only; confirm thermophysical properties, corrosion, fouling, BPE, NPSH and local code.");

  return {
    inputs: {
      capacityTph, capacityTpd: dailyThroughputTpd, dailyThroughputTpd, dailyFeedKld, operatingHours, density, feedConc, finalConc, feedTemp, boilingTemp, heatLift,
      compressorEfficiency: compressorEfficiency * 100, uValue, heatRecovery: recovery * 100,
      industry: raw.industry || "General wastewater", product: raw.product || "Concentrated process liquor",
      clientName: raw.clientName || "Client / End User", projectName: raw.projectName || "Industrial Wastewater MVR Evaporator",
      projectLocation: raw.projectLocation || "To be confirmed", exchangeRateInrUsd,
    },
    massBalance: {
      feedKgH: round(feedKgH), solidsKgH: round(solidsKgH), productKgH: round(productKgH), evaporationKgH: round(evaporationKgH),
      feedM3h: round(feedM3h, 3), productM3h: round(productM3h, 3), condensateM3h: round(condensateM3h, 3),
      concentrationRatio: round(concentrationRatio), waterRecoveryPct: round(waterRecoveryPct),
      tdsLoadKgDay: round(tdsLoadKgDay), rejectLDay: round(rejectLDay),
      closureKgH: round(productKgH + evaporationKgH - feedKgH, 4),
    },
    thermal: {
      sensibleKw: round(sensibleKw), latentKw: round(latentKw), externalHeatKw: round(externalHeatKw), designAreaM2: round(designAreaM2),
      compressorPowerKw: compression.absorbedKw, compressorMotorKw: compression.motorKw,
      auxiliaryPowerKw: round(auxiliaryAbsorbedKw), auxiliaryConnectedKw: round(auxiliaryConnectedKw),
      totalAbsorbedPowerKw: round(totalAbsorbedKw), totalConnectedPowerKw: round(totalConnectedKw),
      specificEnergyKwhT: round(specificCompressionKwhT), specificPlantEnergyKwhT: round(specificPlantKwhT),
      suctionPressureKpa: compression.suctionPressureKpa, dischargePressureKpa: compression.dischargePressureKpa,
      pressureRatio: compression.pressureRatio, specificWorkKjKg: compression.specificWorkKjKg,
    },
    geometry: { separatorDiameterM: round(separatorDiameterM), separatorHeightM: round(separatorHeightM), calandriaDiameterM: round(calandriaDiameterM), calandriaHeightM: round(calandriaHeightM), feedTankM3: round(feedTankM3), productTankM3: round(productTankM3), condensateTankM3: round(condensateTankM3) },
    plantLayout,
    cost: {
      currencyBasis: "USD, budgetary Q3 2026", accuracy: "Class 4 budget estimate, expected accuracy -30% / +50%",
      exchangeRateInrUsd, items: costItems, subtotalUsd: round(subtotalUsd, 0), contingencyUsd: round(contingencyUsd, 0),
      totalInstalledUsd: round(totalInstalledUsd, 0), totalInstalledInr: round(totalInstalledUsd * exchangeRateInrUsd, 0),
      exclusions: "Taxes, duties, freight outside India, civil building, utility generation, ETP pretreatment, laboratory/pilot trials and client-side interconnections.",
    },
    pumps, lines, valves, instruments, utilities, equipment, warnings,
    designCode: "Preliminary BEP · ASME VIII / TEMA principles · verify local statutory requirements",
  };
}
