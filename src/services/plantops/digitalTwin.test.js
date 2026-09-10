import { calculateMvrTwin } from './digitalTwin';

test('calculates the MVR operating KPIs from mapped SCADA tags', () => {
  const tags = {
    feedFlow: { value: 12.8 }, vaporRate: { value: 8.4 }, condensateRate: { value: 8.2 },
    compressorPower: { value: 610 }, productConcentration: { value: 48 },
    heatTransferCoefficient: { value: 1.84 }, vacuum: { value: -.82 },
    compressorLoad: { value: 76 }, circulationFlow: { value: 184 }, vaporTemperature: { value: 61 }
  };
  const twin = calculateMvrTwin({ tags });
  expect(twin.process).toBe('Single-effect MVR Evaporator');
  expect(twin.kpis.evaporationRate).toBeCloseTo(8.3);
  expect(twin.kpis.specificEnergy).toBeCloseTo(73.49, 1);
  expect(twin.kpis.foulingIndex).toBeGreaterThan(10);
  expect(twin.equipment).toHaveLength(4);
});
