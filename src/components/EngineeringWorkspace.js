import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { planProject } from './engineeringPlanner';
import ProjectSectionPanel from './ProjectSectionPanel';
import { createFallbackProjectModel, normalizeProjectModel, PROJECT_SECTIONS, sectionForOutput } from './projectModel';
import { buyAiCredits, generateEngineeringBrief, getAiPaymentStatus, getAiStatus } from '../services/edgAi';
import './EngineeringWorkspace.css';

const readJson = (key, fallback = null) => {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
  catch (_error) { return fallback; }
};

const readSavedProject = () => readJson('edg-active-project');
const modelKey = (projectId) => `edg-project-model:${projectId}`;
const versionKey = (projectId) => `edg-project-versions:${projectId}`;

const persistJson = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (_error) { /* The in-memory project remains usable. */ }
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
  const [activeSection, setActiveSection] = useState('Overview');
  const [savedModel, setSavedModel] = useState(() => readJson(modelKey(initial.id)));
  const [versions, setVersions] = useState(() => readJson(versionKey(initial.id), []));
  const initialRequest = useRef(false);
  const plan = useMemo(() => planProject(project.prompt, Boolean(project.fileName)), [project]);
  const fallbackModel = useMemo(() => createFallbackProjectModel(plan, project.prompt), [plan, project.prompt]);
  const model = useMemo(() => normalizeProjectModel(savedModel, fallbackModel), [savedModel, fallbackModel]);
  const [basisDraft, setBasisDraft] = useState(() => model.designBasis.join('\n'));

  const storeVersion = useCallback((label, projectModel) => {
    const nextVersion = { id: `version-${Date.now()}`, label, createdAt: new Date().toISOString(), model: projectModel };
    setVersions((current) => {
      const next = [nextVersion, ...current].slice(0, 20);
      persistJson(versionKey(project.id), next);
      return next;
    });
  }, [project.id]);

  const applyModel = useCallback((nextModel, label) => {
    if (!nextModel) return;
    setSavedModel(nextModel);
    setBasisDraft((nextModel.designBasis || []).join('\n'));
    persistJson(modelKey(project.id), nextModel);
    storeVersion(label, nextModel);
  }, [project.id, storeVersion]);

  const runAi = useCallback(async (prompt) => {
    setAiState('loading');
    setAiError('');
    try {
      const result = await generateEngineeringBrief(prompt);
      setAiBrief(result.response);
      setEntitlement(result.entitlement);
      applyModel(result.project, 'AI project model');
      if (result.degraded) setAiError('The model returned no structured tool call, so EDG completed this project with its deterministic engineering route. No paid credit was consumed.');
      setAiState('complete');
    } catch (error) {
      setAiError(error.message);
      if (error.entitlement) setEntitlement(error.entitlement);
      setAiState(error.code === 'CREDITS_REQUIRED' ? 'credits' : 'error');
    }
  }, [applyModel]);

  useEffect(() => {
    getAiStatus().then((status) => setEntitlement(status.entitlement)).catch(() => {});
    if (!initialRequest.current && !savedModel && project.prompt && project.id !== 'edg-new') {
      initialRequest.current = true;
      runAi(project.prompt);
    }
  }, [project.id, project.prompt, runAi, savedModel]);

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
        if (!stopped && ['failed', 'expired', 'refunded'].includes(payment.status)) {
          setCheckoutState('error');
          setAiError(`Payment ${payment.status}. No credits were added.`);
          return;
        }
        if (!stopped && attempts < 30) window.setTimeout(check, 4000);
        if (!stopped && attempts >= 30) {
          setCheckoutState('error');
          setAiError('Payment confirmation timed out. Your order remains safe; reopen this page to check again.');
        }
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
    const contextPrompt = `${clean}\n\nCurrent confirmed design basis:\n${basisDraft}`.slice(0, 6000);
    const next = { ...project, prompt: clean, updatedAt: new Date().toISOString() };
    setProject(next);
    setRevision('');
    persistJson('edg-active-project', next);
    await runAi(contextPrompt);
  };

  const saveBasis = () => {
    const designBasis = basisDraft.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 30);
    const nextModel = { ...model, designBasis };
    setSavedModel(nextModel);
    persistJson(modelKey(project.id), nextModel);
    storeVersion('Design basis saved', nextModel);
  };

  const exportProject = () => {
    const payload = { project, model, exportedAt: new Date().toISOString(), notice: 'Concept-stage engineering project. Qualified professional review is required before real-world use.' };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(model.title || 'edg-project').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openCheckout = async () => {
    setCheckoutState('loading');
    try { await buyAiCredits(); }
    catch (error) { setCheckoutState('error'); setAiError(error.message); }
  };

  return (
    <main className="edg-workspace">
      <header className="workspace-topbar">
        <div><span className="workspace-status" /> EDG ENGINE · STRUCTURED PROJECT MODEL</div>
        <Link to="/">＋ New project</Link>
      </header>

      <div className="workspace-layout">
        <aside className="project-panel">
          <p className="workspace-kicker">ACTIVE PROJECT</p>
          <h1>{model.title || plan.intent}</h1>
          <p className="project-prompt">“{project.prompt}”</p>
          {project.fileName && <p className="project-file">Attachment · {project.fileName}</p>}

          <div className="project-meta"><span>Discipline</span><b>{plan.discipline}</b></div>
          <div className="project-meta"><span>Project stage</span><b>{model.stage} · Preliminary</b></div>

          <label className="mobile-section-select">Project section<select value={activeSection} onChange={(event) => setActiveSection(event.target.value)}>{PROJECT_SECTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <nav className="project-nav" aria-label="Project sections">
            {PROJECT_SECTIONS.map((item, index) => (
              <button className={activeSection === item ? 'active' : ''} type="button" key={item} onClick={() => setActiveSection(item)}><span>{String(index + 1).padStart(2, '0')}</span>{item}</button>
            ))}
          </nav>
        </aside>

        <section className="project-canvas" aria-labelledby="project-plan-heading">
          <div className="canvas-heading">
            <div><p className="workspace-kicker">{activeSection.toUpperCase()} · {model.type.toUpperCase()}</p><h2 id="project-plan-heading">{activeSection === 'Overview' ? 'Industrial project workspace' : activeSection}</h2></div>
            <span>{model.stage}</span>
          </div>
          <p className="plan-summary">Every section is connected to one versioned Project Model. Revise the prompt or design basis and EDG will rebuild the engineering route.</p>

          <article className={`ai-engineering-brief ${aiState}`} aria-live="polite">
            <div className="ai-brief-heading">
              <div><p className="workspace-kicker">EDG AI · PERSISTED GENERATION</p><h3>Project intelligence</h3></div>
              <div className="ai-usage">
                {entitlement && <span>{entitlement.freeRemaining} free today · {entitlement.paidCredits} credits</span>}
                <button type="button" onClick={openCheckout} disabled={checkoutState === 'loading'}>{checkoutState === 'loading' ? 'Opening…' : 'Add 100 credits · $19'}</button>
              </div>
            </div>
            {aiState === 'loading' && <div className="ai-loading"><span /><span /><span /> Building streams, operations, equipment, calculations, and safeguards…</div>}
            {aiState === 'complete' && <div className="ai-complete">Structured project model ready · {model.unitOperations.length} operations · {model.equipment.length} equipment items</div>}
            {aiBrief && <details className="raw-brief"><summary>Read the complete AI engineering brief</summary><div className="ai-brief-content">{aiBrief}</div></details>}
            {aiError && <div className="ai-error"><b>AI service notice</b><span>{aiError}</span>{aiState === 'error' && <small>The deterministic project workspace below remains available.</small>}</div>}
            {checkoutState === 'paid' && <div className="ai-paid">Payment confirmed. Your AI credits are ready.</div>}
          </article>

          <ProjectSectionPanel activeSection={activeSection} model={model} basisDraft={basisDraft} onBasisChange={setBasisDraft} onSaveBasis={saveBasis} versions={versions} onExport={exportProject} onPrint={() => window.print()} />

          {activeSection === 'Overview' && <div className="workspace-cards">
            <article><p className="workspace-kicker">NEXT INPUTS</p><h3>Complete the design basis</h3><ol>{model.missingInputs.slice(0, 6).map((question) => <li key={question}>{question}</li>)}</ol><button className="card-action" type="button" onClick={() => setActiveSection('Design basis')}>Open design basis →</button></article>
            <article><p className="workspace-kicker">PROJECT OUTPUTS</p><h3>Connected deliverables</h3><div className="output-grid">{model.deliverables.map((output) => <button type="button" key={output} onClick={() => setActiveSection(sectionForOutput(output))}>{output}<span>→</span></button>)}</div></article>
          </div>}

          <div className="assumption-banner"><b>Preliminary engineering</b><span>Do not fabricate, install, commission, or operate from this concept alone. Confirm calculations, hazards, codes, materials, environmental obligations, and professional approvals.</span></div>
          {plan.tool && <Link className="workspace-tool-link" to={plan.tool.path}>{plan.tool.label} <span>→</span></Link>}
        </section>
      </div>

      <form className="workspace-revision" onSubmit={applyRevision}>
        <label htmlFor="project-revision" className="sr-only">Revise this engineering project</label>
        <input id="project-revision" value={revision} onChange={(event) => setRevision(event.target.value)} placeholder="Revise: change feed, product, capacity, material, standard, or required output…" />
        <button type="submit" disabled={aiState === 'loading'}>{aiState === 'loading' ? 'Working…' : 'Rebuild project →'}</button>
      </form>
    </main>
  );
};

export default EngineeringWorkspace;
