import React from 'react';
import { Link } from 'react-router-dom';
import './Home.ed.css';
import EvaporatorShowcase from './EvaporatorShowcase';
import ReactorShowcase from "./reactor/ReactorShowcase";
import DistillationShowcase from "./distillation/DistillationShowcase";


const Home = () => {
  return (
    <div className="homepage">
      {/* Hero */}
      <div className="hero-section">
        <video autoPlay loop muted playsInline preload="metadata" className="background-video">
          <source src="/assets/industry4.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className="introduction-text">
          <h1>Engineering Drawing</h1>
          <p>
            We are bringing Industry 4.0 to engineering with state-of-the-art AI-driven design,
            cost-efficient solutions, and sustainable industrial processes.
          </p>

          <a href="/assets/Whitepaper_Engineering_Drawing.pdf" download>
            <button className="download-button">White Paper</button>
          </a>

          <Link to="/presale">
            <button className="presale-button">Join Presale</button>
          </Link>
        </div>
      </div>

      {/* Evaporator card */}
      <EvaporatorShowcase />
      {/* Reactor card (same container & layout) */}
      <ReactorShowcase />
      {/* Distillation card */}
      <DistillationShowcase />

      {/* Categories */}
      <div className="categories-section">
        <div className="category industrial">
          <img src="/assets/industrial.webp" alt="Industrial process design visualization" loading="lazy" decoding="async" />
          <h3>Industrial Design</h3>
          <Link to="/industrial-design">
            <button>Learn More</button>
          </Link>
        </div>

        <div className="category constraction">
          <img src="/assets/construction.webp" alt="Construction design visualization" loading="lazy" decoding="async" />
          <h3>Construction Design</h3>
          <Link to="/construction-design">
            <button>Learn More</button>
          </Link>
        </div>

        <div className="category process">
          <img src="/assets/process.webp" alt="Process design visualization" loading="lazy" decoding="async" />
          <h3>Process Design</h3>
          <Link to="/process-design">
            <button>Learn More</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
