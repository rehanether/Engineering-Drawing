import React from 'react';

const List = ({ items, empty = 'Not yet defined.' }) => (
  items?.length ? <ul className="model-list">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p className="model-empty">{empty}</p>
);

const Route = ({ operations }) => (
  <div className="model-route" aria-label="Project process route">
    {operations.map((operation, index) => (
      <React.Fragment key={`${operation.tag}-${operation.name}`}>
        <article><small>{operation.tag}</small><b>{operation.name}</b><span>{operation.purpose}</span></article>
        {index < operations.length - 1 && <i aria-hidden="true">→</i>}
      </React.Fragment>
    ))}
  </div>
);

const SectionHeading = ({ eyebrow, title, note }) => (
  <header className="model-heading"><p>{eyebrow}</p><h3>{title}</h3>{note && <span>{note}</span>}</header>
);

export default function ProjectSectionPanel({ activeSection, model, basisDraft, onBasisChange, onSaveBasis, versions, onExport, onPrint }) {
  if (activeSection === 'Overview') return (
    <section className="model-section">
      <SectionHeading eyebrow="PROJECT MODEL" title={model.title} note={`${model.stage} stage`} />
      <p className="model-lead">{model.interpretation}</p>
      <div className="model-stat-grid">
        <article><span>Process steps</span><b>{model.unitOperations.length}</b></article>
        <article><span>Equipment items</span><b>{model.equipment.length}</b></article>
        <article><span>Known streams</span><b>{model.streams.length}</b></article>
        <article><span>Open inputs</span><b>{model.missingInputs.length}</b></article>
      </div>
      <div className="model-two-column"><article><h4>Products</h4><List items={model.products} /></article><article><h4>Assumptions</h4><List items={model.assumptions} /></article></div>
    </section>
  );

  if (activeSection === 'Design basis') return (
    <section className="model-section">
      <SectionHeading eyebrow="EDITABLE INPUT" title="Design basis" note="Saved locally as a project version" />
      <p className="model-lead">Record the feed, product, capacity, operating conditions, site constraints, standards, and required deliverables. Ask EDG to recalculate after changing the basis.</p>
      <textarea className="basis-editor" value={basisDraft} onChange={(event) => onBasisChange(event.target.value)} aria-label="Project design basis" rows="12" />
      <div className="model-actions"><button type="button" onClick={onSaveBasis}>Save design-basis version</button></div>
      <div className="model-two-column"><article><h4>Missing inputs</h4><List items={model.missingInputs} /></article><article><h4>Quality and acceptance</h4><List items={model.qualityControls} /></article></div>
    </section>
  );

  if (activeSection === 'Process') return (
    <section className="model-section">
      <SectionHeading eyebrow="PROCESS DEFINITION" title="Unit-operation route" note="Open every block through Equipment" />
      <Route operations={model.unitOperations} />
      <div className="stream-table" role="table" aria-label="Process stream register">
        <div role="row"><b>Tag</b><b>Stream</b><b>Role</b><b>Known / missing basis</b></div>
        {model.streams.map((stream) => <div role="row" key={`${stream.tag}-${stream.name}`}><span>{stream.tag}</span><strong>{stream.name}</strong><span className={`stream-role ${stream.role}`}>{stream.role}</span><span>{[...(stream.knownData || []), ...(stream.missingData || []).map((item) => `Missing: ${item}`)].join(' · ') || 'Basis required'}</span></div>)}
      </div>
    </section>
  );

  if (activeSection === 'Equipment') return (
    <section className="model-section">
      <SectionHeading eyebrow="EQUIPMENT REGISTER" title="Selected process equipment" note="Sizing awaits confirmed inputs" />
      <div className="equipment-grid">{model.equipment.map((item) => <article key={`${item.tag}-${item.name}`}><small>{item.tag}</small><h4>{item.name}</h4><p>{item.service}</p><b>Design inputs</b><List items={item.requiredData} /><b>Safeguards</b><List items={item.safeguards} /></article>)}</div>
    </section>
  );

  if (activeSection === 'Calculations') return (
    <section className="model-section">
      <SectionHeading eyebrow="DETERMINISTIC ENGINE" title="Verified calculations" note="AI requests; code calculates" />
      {model.calculations.length ? <div className="calculation-grid">{model.calculations.map((calculation, index) => <article key={`${calculation.type}-${index}`}><div><h4>{calculation.title}</h4><span className={calculation.status}>{calculation.status}</span></div>{calculation.formula && <code>{calculation.formula}</code>}<dl>{calculation.rows.map((row) => <React.Fragment key={row.label}><dt>{row.label}</dt><dd>{row.value} {row.unit}</dd></React.Fragment>)}</dl><small>{calculation.basis.join(' · ')}</small></article>)}</div> : <p className="model-empty">No verified calculation ran because the prompt did not contain a complete numerical basis. Add the missing values in the revision bar.</p>}
    </section>
  );

  if (activeSection === 'PFD / P&ID') return (
    <section className="model-section">
      <SectionHeading eyebrow="ENGINEERING DIAGRAM" title="Concept PFD and controls register" note="Not construction issue" />
      <Route operations={model.unitOperations} />
      <div className="model-two-column"><article><h4>Safeguards and control functions</h4><List items={model.equipment.flatMap((item) => item.safeguards || [])} /></article><article><h4>Safety review</h4><List items={model.safetyReview} /></article></div>
    </section>
  );

  if (activeSection === 'Utilities') return (
    <section className="model-section">
      <SectionHeading eyebrow="UTILITY REGISTER" title="Plant utility requirements" note="Duties require balances" />
      <div className="utility-grid">{model.utilities.map((utility) => <article key={utility.name}><span>UTILITY</span><h4>{utility.name}</h4><p>{utility.demandBasis}</p></article>)}</div>
    </section>
  );

  if (activeSection === 'Cost') return (
    <section className="model-section">
      <SectionHeading eyebrow="CLASS 5 ESTIMATE BASIS" title="Cost model readiness" note="No invented prices" />
      <p className="model-lead">EDG identifies cost drivers now. A numerical CAPEX/OPEX estimate becomes available only after capacity, equipment sizing, location, currency, estimate date, and utility rates are supplied.</p>
      <div className="model-two-column"><article><h4>Primary cost drivers</h4><List items={model.costDrivers} /></article><article><h4>Required before estimating</h4><List items={['Sized equipment list and materials', 'Site, currency, estimate date, and taxes', 'Installation factors and battery limits', 'Electricity, fuel, water, labor, and waste-disposal rates']} /></article></div>
    </section>
  );

  return (
    <section className="model-section">
      <SectionHeading eyebrow="PROJECT RECORD" title="Files, exports, and versions" note="Portable JSON project model" />
      <div className="export-actions"><button type="button" onClick={onExport}>Download project JSON</button><button type="button" onClick={onPrint}>Print engineering brief</button></div>
      <article className="version-list"><h4>Saved versions</h4>{versions.length ? <ol>{versions.map((version) => <li key={version.id}><b>{version.label}</b><span>{new Date(version.createdAt).toLocaleString()}</span></li>)}</ol> : <p className="model-empty">No manual version saved yet.</p>}</article>
      <div className="model-two-column"><article><h4>Planned deliverables</h4><List items={model.deliverables} /></article><article><h4>Professional release gate</h4><List items={['Confirm calculations independently', 'Complete HAZOP / risk review where applicable', 'Apply governing codes and local approvals', 'Issue drawings and datasheets through qualified professionals']} /></article></div>
    </section>
  );
}
