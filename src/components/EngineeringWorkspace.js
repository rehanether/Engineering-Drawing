import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { planProject } from './engineeringPlanner';
import './EngineeringWorkspace.css';

const readSavedProject = () => {
  try { return JSON.parse(localStorage.getItem('edg-active-project') || 'null'); }
  catch (_error) { return null; }
};

const EngineeringWorkspace = () => {
  const location = useLocation();
  const initial = location.state?.project || readSavedProject() || {
    id: 'edg-new', prompt: 'Start a new engineering project', fileName: '', createdAt: new Date().toISOString(),
  };
  const [project, setProject] = useState(initial);
  const [revision, setRevision] = useState('');
  const plan = useMemo(() => planProject(project.prompt, Boolean(project.fileName)), [project]);

  const applyRevision = (event) => {
    event.preventDefault();
    const clean = revision.trim();
    if (!clean) return;
    const next = { ...project, prompt: clean, updatedAt: new Date().toISOString() };
    setProject(next);
    setRevision('');
    try { localStorage.setItem('edg-active-project', JSON.stringify(next)); } catch (_error) { /* state remains available */ }
  };

  return (
    <main className="edg-workspace">
      <header className="workspace-topbar">
        <div><span className="workspace-status" /> EDG ENGINE · PROJECT MODEL</div>
        <Link to="/">＋ New project</Link>
      </header>

      <div className="workspace-layout">
        <aside className="project-panel">
          <p className="workspace-kicker">ACTIVE PROJECT</p>
          <h1>{plan.intent}</h1>
          <p className="project-prompt">“{project.prompt}”</p>
          {project.fileName && <p className="project-file">Attachment · {project.fileName}</p>}

          <div className="project-meta"><span>Discipline</span><b>{plan.discipline}</b></div>
          <div className="project-meta"><span>Project status</span><b>Design basis required</b></div>

          <nav className="project-nav" aria-label="Project sections">
            {['Overview', 'Design basis', 'Process', 'Equipment', 'Calculations', 'PFD / P&ID', 'Utilities', 'Cost', 'Files & versions'].map((item, index) => (
              <button className={index === 0 ? 'active' : ''} type="button" key={item}><span>{String(index + 1).padStart(2, '0')}</span>{item}</button>
            ))}
          </nav>
        </aside>

        <section className="project-canvas" aria-labelledby="project-plan-heading">
          <div className="canvas-heading">
            <div><p className="workspace-kicker">ENGINEERING PLAN · CONCEPT STAGE</p><h2 id="project-plan-heading">Recommended project route</h2></div>
            <span>Conceptual</span>
          </div>
          <p className="plan-summary">{plan.summary}</p>

          <div className="process-route" aria-label="Recommended process route">
            {plan.steps.map((step, index) => (
              <React.Fragment key={step}>
                <div className="process-node"><small>{String(index + 1).padStart(2, '0')}</small><b>{step}</b></div>
                {index < plan.steps.length - 1 && <span className="route-arrow" aria-hidden="true">→</span>}
              </React.Fragment>
            ))}
          </div>

          <div className="workspace-cards">
            <article><p className="workspace-kicker">INPUTS NEEDED</p><h3>Complete the design basis</h3><ol>{plan.questions.map((question) => <li key={question}>{question}</li>)}</ol></article>
            <article><p className="workspace-kicker">PROJECT OUTPUTS</p><h3>Connected deliverables</h3><div className="output-grid">{plan.outputs.map((output) => <button type="button" key={output}>{output}<span>→</span></button>)}</div></article>
          </div>

          <div className="assumption-banner"><b>Preliminary engineering</b><span>This route is a conceptual starting point. Confirm the design basis, safety constraints, standards, and professional review before use.</span></div>
          {plan.tool && <Link className="workspace-tool-link" to={plan.tool.path}>{plan.tool.label} <span>→</span></Link>}
        </section>
      </div>

      <form className="workspace-revision" onSubmit={applyRevision}>
        <label htmlFor="project-revision" className="sr-only">Revise this engineering project</label>
        <input id="project-revision" value={revision} onChange={(event) => setRevision(event.target.value)} placeholder="Refine the project: change capacity, material, process, or required output…" />
        <button type="submit">Update project →</button>
      </form>
    </main>
  );
};

export default EngineeringWorkspace;
