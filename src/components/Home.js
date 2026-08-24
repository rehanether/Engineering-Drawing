import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.ed.css';

const EXAMPLES = [
  'Design a 5 TPD MVR evaporator',
  'Design a heat exchanger',
  'Build a water treatment process',
  'Analyze this equipment',
];

const Home = () => {
  const navigate = useNavigate();
  const uploadRef = useRef(null);
  const cameraRef = useRef(null);
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState('');

  const startProject = (event) => {
    event?.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt && !file) {
      setNotice('Describe an engineering goal or attach a file to begin.');
      return;
    }
    const project = {
      id: `edg-${Date.now()}`,
      prompt: cleanPrompt || `Analyze the uploaded file: ${file.name}`,
      fileName: file?.name || '',
      createdAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem('edg-active-project', JSON.stringify(project));
    } catch (_error) {
      // The workspace also receives the project through navigation state.
    }
    navigate('/workspace', { state: { project } });
  };

  const handleFile = (event) => {
    const selected = event.target.files?.[0];
    if (selected) {
      setFile(selected);
      setNotice('');
    }
  };

  const startVoice = () => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice('Voice input is not supported by this browser. You can type your request instead.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onstart = () => { setListening(true); setNotice('Listening…'); };
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      setPrompt((current) => `${current}${current ? ' ' : ''}${transcript}`);
    };
    recognition.onerror = () => setNotice('Voice input stopped. Please try again or type your request.');
    recognition.onend = () => { setListening(false); setNotice(''); };
    recognition.start();
  };

  return (
    <main className="homepage">
      <section className="ai-hero" aria-labelledby="ai-hero-title">
        <video autoPlay loop muted playsInline preload="metadata" className="ai-hero-video" aria-hidden="true">
          <source src="/assets/industry4.mp4" type="video/mp4" />
        </video>
        <div className="ai-hero-overlay" />

        <div className="ai-hero-content">
          <p className="ai-eyebrow"><span /> EDG ENGINE · ENGINEERING INTELLIGENCE</p>
          <h1 id="ai-hero-title">Tell us what you want to build.</h1>
          <p className="ai-hero-lede">
            Turn an idea, product, image, raw material, or engineering requirement into an engineered system.
          </p>

          <form className="engineering-prompt" onSubmit={startProject}>
            <label htmlFor="engineering-goal" className="sr-only">Describe your engineering goal</label>
            <textarea
              id="engineering-goal"
              value={prompt}
              onChange={(event) => { setPrompt(event.target.value); setNotice(''); }}
              placeholder="Describe your product, process, equipment, or engineering goal…"
              rows="3"
              maxLength="1200"
            />
            {file && (
              <div className="file-chip">
                <span aria-hidden="true">↗</span> {file.name}
                <button type="button" onClick={() => setFile(null)} aria-label={`Remove ${file.name}`}>×</button>
              </div>
            )}
            <div className="prompt-actions">
              <div className="input-actions">
                <button type="button" onClick={() => uploadRef.current?.click()} aria-label="Upload a drawing, image, or document"><span aria-hidden="true">＋</span> Upload</button>
                <button type="button" onClick={() => cameraRef.current?.click()} aria-label="Take an equipment photo"><span aria-hidden="true">▣</span> Camera</button>
                <button type="button" className={listening ? 'is-listening' : ''} onClick={startVoice} aria-label="Describe your goal by voice"><span aria-hidden="true">◉</span> {listening ? 'Listening' : 'Voice'}</button>
              </div>
              <button className="start-button" type="submit">Start engineering <span aria-hidden="true">→</span></button>
            </div>
            <input ref={uploadRef} className="sr-only" type="file" onChange={handleFile} accept="image/*,.pdf,.dwg,.dxf,.csv,.xlsx,.doc,.docx" />
            <input ref={cameraRef} className="sr-only" type="file" onChange={handleFile} accept="image/*" capture="environment" />
          </form>
          <p className="prompt-notice" role="status">{notice}</p>

          <div className="example-prompts" aria-label="Example engineering prompts">
            <span>Try:</span>
            {EXAMPLES.map((example) => <button key={example} type="button" onClick={() => setPrompt(example)}>{example}</button>)}
          </div>
        </div>
      </section>

      <section className="capabilities" aria-labelledby="capabilities-title">
        <div className="section-heading">
          <p>ONE INTERFACE · FOUR WAYS TO BEGIN</p>
          <h2 id="capabilities-title">From question to engineered system</h2>
          <span>EDG identifies the workflow, organizes the project, and connects each answer to the right engineering tool.</span>
        </div>
        <div className="capability-grid">
          <article><b>01</b><h3>Ask &amp; understand</h3><p>Analyze equipment, drawings, datasheets, labels, and process images with clear observed, estimated, and unknown findings.</p></article>
          <article><b>02</b><h3>Design equipment</h3><p>Move from process duty to sizing, materials, datasheets, calculations, drawings, and professional review.</p></article>
          <article><b>03</b><h3>Build a process</h3><p>Develop unit operations, mass and energy balances, utilities, PFDs, P&amp;IDs, equipment, and economics.</p></article>
          <article><b>04</b><h3>Reverse engineer</h3><p>Break a product or machine into its functional architecture, probable materials, components, and manufacturing methods.</p></article>
        </div>
      </section>

      <section className="live-tools" aria-labelledby="live-tools-title">
        <div className="section-heading compact">
          <p>DETERMINISTIC ENGINEERING TOOLS</p>
          <h2 id="live-tools-title">Go from conversation to calculation</h2>
        </div>
        <div className="live-tool-grid">
          <Link to="/evaporators"><img src="/assets/mvr-evaporator.gif" alt="MVR evaporator simulation" /><div><span>EVAPORATION</span><h3>MVR Evaporator</h3><p>HMBD · PFD · equipment sizing · 3D plant</p></div><b>Open tool →</b></Link>
          <Link to="/reactors"><img src="/assets/reactor.gif" alt="Industrial reactor simulation" /><div><span>REACTION</span><h3>Industrial Reactor</h3><p>Feed basis · kinetics · safety · 3D plant</p></div><b>Open tool →</b></Link>
          <Link to="/distillation"><img src="/assets/distillation.gif" alt="Distillation column simulation" /><div><span>SEPARATION</span><h3>Distillation Column</h3><p>Separation · utilities · column design · 3D plant</p></div><b>Open tool →</b></Link>
        </div>
      </section>

      <section className="safety-note">
        <span aria-hidden="true">✓</span>
        <div><b>Engineering judgment stays visible.</b><p>Assumptions, calculation basis, safety constraints, and review requirements remain attached to every project.</p></div>
        <Link to="/project-overview">How EDG works →</Link>
      </section>
    </main>
  );
};

export default Home;
