import React, { useState } from 'react';
import './GatewaySetup.css';

export default function GatewaySetup() {
  const [plant, setPlant] = useState('');
  const [protocol, setProtocol] = useState('OPC UA');
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  function download(event) {
    event.preventDefault();
    const name = plant.trim();
    if (!name) return;
    const config = { schemaVersion: 1, plant: name, protocol, mode: 'shadow', realWritesEnabled: false, status: 'uncommissioned', endpoint: null, tagMappings: [], credentials: 'Provision locally on the gateway; never include in this file' };
    const url = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'edg-gateway-plan.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaved(true); setMessage('Connection plan downloaded. No plant connection has been established.');
  }
  return <article className="edg-gateway" aria-labelledby="gateway-title">
    <div className="edg-gateway-intro"><span>EDG GATEWAY</span><h2 id="gateway-title">Your plant. Connected intelligence.</h2><p>Bring operating data into EDG. Understand performance, evaluate targets, and prepare your plant for supervised optimization.</p><div className="edg-gateway-path">Plant data <b>→</b> EDG Gateway <b>→</b> PlantOps</div></div>
    <div className="edg-gateway-options">
      <details><summary>Connect a plant <small>{saved ? 'Plan prepared' : 'Prepare connection'}</small></summary>
        <form onSubmit={download}><label>Plant name<input required maxLength={80} value={plant} onChange={e => { setPlant(e.target.value); setSaved(false); }} placeholder="e.g. Evaporation plant · Line 1" /></label><label>Data interface<select value={protocol} onChange={e => { setProtocol(e.target.value); setSaved(false); }}>{['OPC UA', 'MQTT', 'Modbus TCP', 'REST', 'Historian'].map(p => <option key={p}>{p}</option>)}</select></label><p>Prepare a commissioning plan for your site engineer. Gateway installation, authentication and tag mapping are required before real data is available.</p><button type="submit">Download connection plan</button></form>
      </details>
      <details><summary>Observe & optimize <small>MVR simulator available</small></summary><p>The dashboard below receives simulated MVR data. Approve a trial to apply a bounded simulated setpoint and measure its response.</p><button type="button" onClick={() => { document.querySelector('.po-modes')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setMessage('Showing the MVR simulator. No real plant connected.'); }}>Open MVR simulator</button></details>
      <details><summary>Remote support <small>AnyDesk · Human support</small></summary><p>Use your organization’s approved AnyDesk session for human maintenance. EDG does not launch a remote session, store remote-access passwords, or read SCADA screens through AnyDesk.</p><p>Automated plant observation requires the EDG data gateway connection.</p></details>
    </div><p role="status" className="edg-gateway-status">{message || 'Gateway setup preview · Real plant connectivity is not configured'}</p>
  </article>;
}
