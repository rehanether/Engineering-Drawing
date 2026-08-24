import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.ed.css';

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
      <section className="hero-section" aria-labelledby="home-title">
        <video autoPlay loop muted playsInline preload="metadata" className="background-video" aria-hidden="true">
          <source src="/assets/industry4.mp4" type="video/mp4" />
        </video>
        <div className="hero-left-stack">
          <div className="introduction-text">
            <h1 id="home-title">Engineering Drawing</h1>
            <p>We are bringing Industry 4.0 to engineering with state-of-the-art AI-driven design, cost-efficient solutions, and sustainable industrial processes.</p>
            <div className="legacy-actions">
              <a href="/assets/Whitepaper_Engineering_Drawing.pdf" download><button className="download-button" type="button">White Paper</button></a>
              <Link to="/presale"><button className="presale-button" type="button">Join Presale</button></Link>
            </div>
          </div>

          <form className="engineering-prompt compact-prompt" onSubmit={startProject}>
            <div className="compact-prompt-title"><span>EDG AI</span><b>What do you want to build?</b></div>
            <div className="compact-prompt-entry">
              <label htmlFor="engineering-goal" className="sr-only">Describe your engineering goal</label>
              <textarea id="engineering-goal" value={prompt} onChange={(event) => { setPrompt(event.target.value); setNotice(''); }} placeholder="Describe a product, process, equipment, or engineering goal…" rows="2" maxLength="1200" />
              <button className="start-button" type="submit" aria-label="Start engineering">→</button>
            </div>
            <div className="compact-prompt-footer">
              <div className="input-actions">
                <button type="button" onClick={() => uploadRef.current?.click()} aria-label="Upload a drawing, image, or document"><span aria-hidden="true">＋</span> Upload</button>
                <button type="button" onClick={() => cameraRef.current?.click()} aria-label="Take an equipment photo"><span aria-hidden="true">▣</span> Camera</button>
                <button type="button" className={listening ? 'is-listening' : ''} onClick={startVoice} aria-label="Describe your goal by voice"><span aria-hidden="true">◉</span> {listening ? 'Listening' : 'Voice'}</button>
              </div>
              <small role="status">{file ? file.name : notice}</small>
            </div>
            <input ref={uploadRef} className="sr-only" type="file" onChange={handleFile} accept="image/*,.pdf,.dwg,.dxf,.csv,.xlsx,.doc,.docx" />
            <input ref={cameraRef} className="sr-only" type="file" onChange={handleFile} accept="image/*" capture="environment" />
          </form>
        </div>
        <div className="hero-equipment" aria-label="Industrial design simulators">
          <Link to="/evaporators"><img src="/assets/mvr-evaporator.gif" alt="" /><span>MVR Evaporator</span><small>Live HMBD · PFD · 3D plant</small></Link>
          <Link to="/reactors"><img src="/assets/reactor.gif" alt="" /><span>Industrial Reactor</span><small>Feed basis · kinetics · 3D plant</small></Link>
          <Link to="/distillation"><img src="/assets/distillation.gif" alt="" /><span>Distillation Column</span><small>Separation · utilities · 3D plant</small></Link>
        </div>
      </section>

      <section className="categories-section" aria-label="Engineering design categories">
        <article className="category industrial"><img src="/assets/industrial.webp" alt="Industrial process design visualization" loading="lazy" decoding="async" /><h3>Industrial Design</h3><Link to="/industrial-design"><button type="button">Learn More</button></Link></article>
        <article className="category constraction"><img src="/assets/construction.webp" alt="Construction design visualization" loading="lazy" decoding="async" /><h3>Construction Design</h3><Link to="/construction-design"><button type="button">Learn More</button></Link></article>
        <article className="category process"><img src="/assets/process.webp" alt="Process design visualization" loading="lazy" decoding="async" /><h3>Process Design</h3><Link to="/process-design"><button type="button">Learn More</button></Link></article>
      </section>
    </main>
  );
};

export default Home;
