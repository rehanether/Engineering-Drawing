export const CONTROL_STEPS = ['Observe', 'Recommend', 'Operator approval', 'Simulated write', 'Verify response', 'Audit'];

export async function runSimulatedApproval(adapter, recommendation, onStep) {
  const steps = ['Operator approval', 'Simulated write', 'Verify response', 'Audit'];
  for (const step of steps) {
    onStep(step);
    if (step === 'Simulated write') await adapter.simulateSetpointWrite('SP-FT-301', 190);
    await new Promise(resolve => setTimeout(resolve, 450));
  }
  return { ...recommendation, approvalStatus: 'Applied in simulation', completedAt: new Date().toISOString() };
}
