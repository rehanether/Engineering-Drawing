const COMMON_OUTPUTS = ['Process overview', 'Mass balance', 'Equipment', 'PFD', 'P&ID', 'Utilities', 'Cost', '3D / CAD'];

const rules = [
  {
    match: /evaporat|concentrat|dissolved solids/i,
    intent: 'Evaporation process design',
    discipline: 'Process · Thermal · Mechanical',
    summary: 'A concentration problem that requires a feed basis, evaporation duty, vapor handling, heat integration, and equipment definition.',
    steps: ['Feed tank', 'Preheater', 'MVR evaporator', 'Vapor separator', 'Concentrate storage'],
    questions: ['Feed flow and composition', 'Initial and target solids', 'Operating hours and fouling tendency'],
    tool: { label: 'Open MVR design engine', path: '/evaporators' },
  },
  {
    match: /distill|separat|purif|column/i,
    intent: 'Separation process design',
    discipline: 'Process · Thermodynamics · Mechanical',
    summary: 'A separation problem that requires component data, product specifications, operating pressure, stage estimates, and utility targets.',
    steps: ['Feed conditioning', 'Preheater', 'Distillation column', 'Condenser', 'Reboiler', 'Product storage'],
    questions: ['Feed composition and flow', 'Required product purities', 'Pressure or temperature constraints'],
    tool: { label: 'Open distillation engine', path: '/distillation' },
  },
  {
    match: /react|kinetic|conversion|hydrogen|chemical/i,
    intent: 'Reaction system design',
    discipline: 'Process · Reaction · Safety',
    summary: 'A reaction engineering problem that requires chemistry, kinetics, heat effects, containment, separation, and process-safety review.',
    steps: ['Feed preparation', 'Metering', 'Reactor', 'Heat removal', 'Primary separator', 'Product finishing'],
    questions: ['Reaction and feed chemistry', 'Capacity and desired conversion', 'Temperature, pressure, and hazard basis'],
    tool: { label: 'Open reactor design engine', path: '/reactors' },
  },
  {
    match: /heat exchanger|cooling|heating|heat duty/i,
    intent: 'Heat-transfer equipment design',
    discipline: 'Thermal · Mechanical · Materials',
    summary: 'A heat-transfer problem requiring duty, temperature program, physical properties, configuration, area, and pressure-drop checks.',
    steps: ['Hot-side inlet', 'Heat exchanger', 'Hot-side outlet', 'Cold-side inlet', 'Cold-side outlet'],
    questions: ['Both stream flow rates', 'Inlet and target temperatures', 'Pressure limits, properties, and material constraints'],
  },
  {
    match: /water treatment|effluent|water process|waste water/i,
    intent: 'Water-treatment process design',
    discipline: 'Process · Environmental · Hydraulic',
    summary: 'A treatment-train problem requiring feed characterization, discharge or reuse targets, solids handling, utilities, and safeguards.',
    steps: ['Screening', 'Equalization', 'Primary treatment', 'Biological / chemical treatment', 'Filtration', 'Polishing', 'Reuse or discharge'],
    questions: ['Flow and contaminant analysis', 'Required outlet specification', 'Site, utility, and sludge-disposal constraints'],
  },
  {
    match: /milk powder|powder|spray dry|drying/i,
    intent: 'Product manufacturing process',
    discipline: 'Process · Food · Thermal',
    summary: 'A production-route problem combining feed preparation, concentration, drying, product handling, hygiene, and quality control.',
    steps: ['Feed inspection', 'Filtration', 'Standardization', 'Pasteurization', 'Evaporation', 'Spray drying', 'Cooling', 'Packaging'],
    questions: ['Feed specification and daily capacity', 'Final moisture and product specification', 'Applicable hygiene and quality standards'],
  },
  {
    match: /analy[sz]e|photo|image|equipment|machine|reverse|component|drawing|p&id|datasheet/i,
    intent: 'Engineering analysis & reverse engineering',
    discipline: 'Vision · Mechanical · Manufacturing',
    summary: 'An analysis workflow that separates visible evidence from engineering estimates and unknown internal details.',
    steps: ['Asset intake', 'Observed features', 'Component breakdown', 'Functional architecture', 'Materials estimate', 'Manufacturing methods', 'Verification plan'],
    questions: ['Clear overall and close-up images', 'Known scale, model, or operating context', 'Required output: explanation, BOM, drawing, or redesign'],
  },
];

export function planProject(prompt = '', hasFile = false) {
  const selected = rules.find((rule) => rule.match.test(prompt)) || {
    intent: hasFile ? 'Engineering asset analysis' : 'Integrated engineering project',
    discipline: 'Process · Equipment · Project',
    summary: 'A multidisciplinary engineering request. EDG will establish the design basis, select a process route, define equipment, and keep assumptions traceable.',
    steps: ['Design basis', 'Process route', 'Unit operations', 'Equipment definition', 'Balances and utilities', 'Documentation', 'Professional review'],
    questions: ['Feed, product, or asset description', 'Capacity and operating conditions', 'Required deliverables and applicable standards'],
  };

  return { ...selected, outputs: COMMON_OUTPUTS };
}
