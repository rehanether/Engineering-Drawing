export function getRecommendations(twin) {
  return [{
    id: 'rec-circulation-01', severity: 'opportunity', issue: 'Heat-transfer efficiency is trending below clean-bundle baseline',
    evidence: `Calculated fouling indicator ${twin.kpis.foulingIndex.toFixed(1)}%; circulation remains stable at ${twin.kpis.circulationFlow.toFixed(0)} m³/h.`,
    suggestedTarget: 'Increase circulation setpoint from 184 to 190 m³/h', expectedBenefit: '1.8–2.4% more evaporation; ~12 kW/t lower SEC',
    confidence: 87, safetyConstraints: ['Circulation ≤ 205 m³/h', 'Motor load ≤ 92%', 'No active pump alarm'],
    approvalStatus: 'Awaiting operator', timestamp: new Date().toISOString(), rollbackCondition: 'Rollback if vibration rises >10% or vacuum deviates >0.03 bar'
  }];
}
