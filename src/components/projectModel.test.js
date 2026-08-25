import { createFallbackProjectModel, normalizeProjectModel, sectionForOutput } from './projectModel';

const plan = {
  intent: 'Water-treatment process design',
  summary: 'Treat an industrial water stream.',
  steps: ['Screening', 'Equalization', 'Filtration'],
  questions: ['Feed analysis'],
  outputs: ['Process overview', 'Mass balance', 'Equipment', 'PFD', 'Utilities', 'Cost'],
};

test('creates a complete safe fallback project model', () => {
  const model = createFallbackProjectModel(plan, 'Design a water treatment plant');
  expect(model.unitOperations).toHaveLength(3);
  expect(model.equipment[0].tag).toBe('E-001');
  expect(model.safetyReview[0]).toMatch(/professional review/i);
});

test('normalizes partial AI project data without losing fallback sections', () => {
  const fallback = createFallbackProjectModel(plan, 'Design a water treatment plant');
  const model = normalizeProjectModel({ title: 'Custom plant', equipment: [] }, fallback);
  expect(model.title).toBe('Custom plant');
  expect(model.unitOperations).toHaveLength(3);
  expect(model.equipment).toEqual([]);
});

test('routes deliverable buttons to functional workspace sections', () => {
  expect(sectionForOutput('Mass balance')).toBe('Calculations');
  expect(sectionForOutput('P&ID')).toBe('PFD / P&ID');
  expect(sectionForOutput('CAPEX cost')).toBe('Cost');
});
