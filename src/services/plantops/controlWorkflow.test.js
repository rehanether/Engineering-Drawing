import { MockScadaAdapter } from './MockScadaAdapter';
import { runSimulatedApproval } from './controlWorkflow';

test('real writes and invalid simulator targets are rejected', async () => {
  const adapter = new MockScadaAdapter();
  await adapter.connect();
  await expect(adapter.writeSetpoint()).rejects.toThrow();
  await expect(adapter.simulateSetpointWrite('unknown', 190)).rejects.toThrow();
  await expect(adapter.simulateSetpointWrite('SP-FT-301', 206)).rejects.toThrow();
  expect(adapter.circulationTarget).toBe(184);
});

test('approved trial changes the model and verifies a measured response', async () => {
  const adapter = new MockScadaAdapter();
  await adapter.connect();
  const result = await runSimulatedApproval(adapter, { id: 'test' }, () => {});
  expect(result.measuredFlow).toBeGreaterThan(189);
  expect(adapter.circulationTarget).toBe(190);
});

test('failed verification restores the previous target', async () => {
  const adapter = new MockScadaAdapter();
  await adapter.connect();
  const read = adapter.readSnapshot.bind(adapter);
  let count = 0;
  adapter.readSnapshot = async () => {
    const snapshot = await read();
    if (++count > 1) snapshot.tags.vacuum.value = 0;
    return snapshot;
  };
  await expect(runSimulatedApproval(adapter, {}, () => {})).rejects.toThrow('restored');
  expect(adapter.circulationTarget).toBe(184);
});
