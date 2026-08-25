import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { planProject } from './engineeringPlanner';
import { buyAiCredits, generateEngineeringBrief, getAiPaymentStatus, getAiStatus } from '../services/edgAi';
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
  const [aiBrief, setAiBrief] = useState('');
  const [aiState, setAiState] = useState('idle');
  const [aiError, setAiError] = useState('');
  const [entitlement, setEntitlement] = useState(null);
  const [checkoutState, setCheckoutState] = useState('idle');
  const initialRequest = useRef(false);
  const plan = useMemo(() => planProject(project.prompt, Boolean(project.fileName)), [project]);

  const runAi = useCallback(async (prompt) => {
    setAiState('loading');
    setAiError('');
    try {
      const result = await generateEngineeringBrief(prompt);
      setAiBrief(result.response);
      setEntitlement(result.entitlement);
      setAiState('complete');
    } catch (error) {
      setAiError(error.message);
      if (error.entitlement) setEntitlement(error.entitlement);
      setAiState(error.code === 'CREDITS_REQUIRED' ? 'credits' : 'error');
    }
  }, []);

  useEffect(() => {
    getAiStatus().then((status) => setEntitlement(status.entitlement)).catch(() => {});
    if (!initialRequest.current && project.prompt && project.id !== 'edg-new') {
      initialRequest.current = true;
      runAi(project.prompt);
    }
  }, [project.id, project.prompt, runAi]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('order') || localStorage.getItem('edg-ai-payment-order');
    if (params.get('payment') !== 'return' || !orderId?.startsWith('AI-')) return undefined;
    let stopped = false;
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      try {
        const payment = await getAiPaymentStatus(orderId);
        if (['confirmed', 'finished'].includes(payment.status)) {
          const status = await getAiStatus();
          if (!stopped) {
            setEntitlement(status.entitlement);
            setCheckoutState('paid');
            localStorage.removeItem('edg-ai-payment-order');
            window.history.replaceState({}, '', window.location.pathname);
          }
          return;
        }
        if (!stopped && attempts < 30 && !['failed', 'expired', 'refunded'].includes(payment.status)) window.setTimeout(check, 4000);
      } catch (_error) {
        if (!stopped) setCheckoutState('error');
      }
    };
    check();
    return () => { stopped = true; };
  }, []);

  const applyRevision = async (event) => {
    event.preventDefault();
    const clean = revision.trim();
    if (!clean) return;
    const next = { ...project, prompt: clean, updatedAt: new Date().toISOString() };
    setProject(next);
    setRevision('');
    try { localStorage.setItem('edg-active-project', JSON.stringify(next)); } catch (_error) { /* state remains available */ }
    await runAi(clean);
  };

  const openCheckout = async () => {
    setCheckoutState('loading');
    try { await buyAiCredits(); }
    catch (error) { setCheckoutState('error'); setAiError(error.message); }
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

          <article className={`ai-engineering-brief ${aiState}`} aria-live="polite">
            <div className="ai-brief-heading">
              <div><p className="workspace-kicker">EDG AI · PERSISTED GENERATION</p><h3>Engineering brief</h3></div>
              <div className="ai-usage">
                {entitlement && <span>{entitlement.freeRemaining} free today · {entitlement.paidCredits} credits</span>}
                <button type="button" onClick={openCheckout} disabled={checkoutState === 'loading'}>{checkoutState === 'loading' ? 'Opening…' : 'Add 100 credits · $19'}</button>
              </div>
            </div>
            {aiState === 'loading' && <div className="ai-loading"><span /><span /><span /> Building a traceable engineering brief…</div>}
            {aiBrief && <div className="ai-brief-content">{aiBrief}</div>}
            {aiError && <div className="ai-error"><b>AI service notice</b><span>{aiError}</span>{aiState === 'error' && <small>The deterministic project route below remains available.</small>}</div>}
            {checkoutState === 'paid' && <div className="ai-paid">Payment confirmed. Your AI credits are ready.</div>}
          </article>

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
        <button type="submit" disabled={aiState === 'loading'}>{aiState === 'loading' ? 'Working…' : 'Update project →'}</button>
      </form>
    </main>
  );
};

export default EngineeringWorkspace;
