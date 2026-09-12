export const CONTROL_STEPS = ['Observe', 'Recommend', 'Operator approval', 'Simulated write', 'Verify response', 'Audit'];

export async function runSimulatedApproval(adapter, recommendation, onStep) {
  const previous = adapter.circulationTarget;
  const before = await adapter.readSnapshot();
  if (before.tags.circulationFlow.quality !== 'Good') throw new Error('Bad data quality blocks trial');
  onStep('Operator approval');
  try {
    onStep('Simulated write');
    await adapter.simulateSetpointWrite('SP-FT-301', 190);
    onStep('Verify response');
    let after;
    for (let sample = 0; sample < 5; sample += 1) {
      await new Promise(resolve => setTimeout(resolve, 450));
      after = await adapter.readSnapshot();
      if (Math.abs(after.tags.vacuum.value - before.tags.vacuum.value) > .03) throw new Error('Vacuum deviation');
    }
    if (Math.abs(after.tags.circulationFlow.value - 190) > 1) throw new Error('Setpoint response outside tolerance');
    onStep('Audit');
    return { ...recommendation, approvalStatus: 'Verified in simulation', measuredFlow: after.tags.circulationFlow.value, completedAt: new Date().toISOString() };
  } catch (error) {
    try { await adapter.simulateSetpointWrite('SP-FT-301', previous); }
    catch (rollbackError) { throw new Error(`${error.message}; rollback failed: ${rollbackError.message}`); }
    throw new Error(`${error.message}; previous simulated target restored`);
  }
}
