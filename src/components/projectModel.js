export const PROJECT_SECTIONS = [
  'Overview',
  'Design basis',
  'Process',
  'Equipment',
  'Calculations',
  'PFD / P&ID',
  'Utilities',
  'Cost',
  'Files & versions',
];

const utilityForStep = (step) => {
  if (/heat|evaporat|distill|dry|preheat/i.test(step)) return 'Thermal utility or heat recovery';
  if (/pump|compress|blower|fan/i.test(step)) return 'Electrical power';
  if (/react|mix|tank/i.test(step)) return 'Agitation, controls, and electrical power';
  return 'Utility demand to be established from the confirmed design basis';
};

export function createFallbackProjectModel(plan, prompt) {
  const unitOperations = plan.steps.map((name, index) => ({
    tag: `U-${String(index + 1).padStart(3, '0')}`,
    name,
    purpose: `Perform the ${name.toLowerCase()} step in the proposed process route.`,
    designChecks: ['Capacity and operating conditions', 'Materials compatibility', 'Isolation, controls, and maintainability'],
  }));
  return {
    schemaVersion: 1,
    title: plan.intent,
    type: 'process',
    stage: 'Concept',
    interpretation: plan.summary,
    designBasis: [prompt, ...plan.questions.map((question) => `Confirm: ${question}`)],
    products: ['Product specification to be confirmed'],
    streams: [
      { tag: 'S-101', name: 'Feed', role: 'feed', knownData: [], missingData: ['Flow, composition, temperature, and pressure'] },
      { tag: 'S-102', name: 'Product', role: 'product', knownData: [], missingData: ['Required rate, quality, temperature, and pressure'] },
    ],
    unitOperations,
    equipment: unitOperations.map((unit, index) => ({
      tag: `E-${String(index + 1).padStart(3, '0')}`,
      name: unit.name,
      service: unit.purpose,
      requiredData: unit.designChecks,
      safeguards: ['Hazard review and protective functions to be defined'],
    })),
    calculations: [],
    utilities: [...new Set(plan.steps.map(utilityForStep))].map((name) => ({ name, demandBasis: 'Calculate after stream and equipment duties are confirmed.' })),
    qualityControls: ['Define feed acceptance and final product release specifications'],
    costDrivers: ['Capacity', 'Materials of construction', 'Operating conditions', 'Utility demand', 'Site and regulatory requirements'],
    assumptions: ['Concept-stage route generated from the current prompt'],
    deliverables: plan.outputs,
    missingInputs: plan.questions,
    safetyReview: ['Qualified professional review of engineering and process safety is required before procurement, fabrication, installation, or operation.'],
  };
}

export function normalizeProjectModel(model, fallback) {
  if (!model || typeof model !== 'object') return fallback;
  const array = (value, defaultValue = []) => Array.isArray(value) ? value : defaultValue;
  return {
    ...fallback,
    ...model,
    designBasis: array(model.designBasis, fallback.designBasis),
    products: array(model.products, fallback.products),
    streams: array(model.streams, fallback.streams),
    unitOperations: array(model.unitOperations, fallback.unitOperations),
    equipment: array(model.equipment, fallback.equipment),
    calculations: array(model.calculations),
    utilities: array(model.utilities, fallback.utilities),
    qualityControls: array(model.qualityControls, fallback.qualityControls),
    costDrivers: array(model.costDrivers, fallback.costDrivers),
    assumptions: array(model.assumptions, fallback.assumptions),
    deliverables: array(model.deliverables, fallback.deliverables),
    missingInputs: array(model.missingInputs, fallback.missingInputs),
    safetyReview: array(model.safetyReview, fallback.safetyReview),
  };
}

export function sectionForOutput(output) {
  if (/mass balance|calculation/i.test(output)) return 'Calculations';
  if (/equipment|3d|cad/i.test(output)) return 'Equipment';
  if (/pfd|p&id/i.test(output)) return 'PFD / P&ID';
  if (/utilit/i.test(output)) return 'Utilities';
  if (/cost|economic/i.test(output)) return 'Cost';
  return /process/i.test(output) ? 'Process' : 'Overview';
}
