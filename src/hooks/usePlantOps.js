import { useEffect, useMemo, useState } from 'react';
import { MockScadaAdapter } from '../services/plantops/MockScadaAdapter';
import { calculateMvrTwin } from '../services/plantops/digitalTwin';
import { getRecommendations } from '../services/plantops/recommendations';
import { runSimulatedApproval } from '../services/plantops/controlWorkflow';

export function usePlantOps() {
  const adapter = useMemo(() => new MockScadaAdapter(), []);
  const [connection, setConnection] = useState(adapter.getConnection());
  const [snapshot, setSnapshot] = useState(null);
  const [mode, setMode] = useState('Copilot');
  const [activeStep, setActiveStep] = useState('Observe');
  const [audit, setAudit] = useState([{ time: new Date().toISOString(), event: 'PlantOps session initialized', actor: 'System' }]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    adapter.connect().then(status => { if (alive) setConnection(status); });
    const update = async () => { const next = await adapter.readSnapshot(); if (alive) setSnapshot(next); };
    update(); const timer = setInterval(update, 2200);
    return () => { alive = false; clearInterval(timer); adapter.disconnect(); };
  }, [adapter]);
  const twin = snapshot ? calculateMvrTwin(snapshot) : null;
  const recommendations = twin ? getRecommendations(twin) : [];
  const approve = async recommendation => {
    if (busy || mode === 'Read Only') return;
    setBusy(true);
    try {
      const result = await runSimulatedApproval(adapter, recommendation, setActiveStep);
      setAudit(items => [{ time: result.completedAt, event: `Simulated response measured: ${result.measuredFlow.toFixed(1)} m³/h (target 190)`, actor: 'Demo operator' }, ...items]);
    } catch (error) {
      setAudit(items => [{ time: new Date().toISOString(), event: `Trial failed: ${error.message}`, actor: 'Simulator' }, ...items]);
      setActiveStep('Observe');
    } finally { setBusy(false); }
  };
  return { connection, snapshot, twin, recommendations, mode, setMode, activeStep, audit, busy, approve };
}
