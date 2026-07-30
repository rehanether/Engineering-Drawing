import React from 'react';
import { Link } from 'react-router-dom';
import './ProjectOverview.css';

const ProjectOverview = () => {
  return (
    <main className="project-overview">
      <section className="hero-section" aria-labelledby="project-overview-title">
        <div className="hero-copy">
          <p className="eyebrow">Industrial engineering, evolved</p>
          <h1 id="project-overview-title">Engineering Excellence through Industry 4.0</h1>
          <p>
            We design efficient, transparent and sustainable industrial systems that help teams move from concept to confident execution.
          </p>
        </div>
        <img
          src="/assets/hero-industry.gif"
          alt="Industry 4.0 industrial engineering visualization"
          className="hero-image"
          width="420"
          height="320"
          decoding="async"
        />
      </section>

      <section className="core-focus" aria-labelledby="core-focus-title">
        <h2 id="core-focus-title">Our Core Focus</h2>
        <div className="focus-grid">
          <article className="focus-card">
            <img src="/assets/industry4_icon.png" alt="Industry 4.0 automation icon" width="52" height="52" loading="lazy" decoding="async" />
            <h3>Industry 4.0 Solutions</h3>
            <p>Advanced automation and data-driven design for smarter, interconnected and self-optimizing plants.</p>
          </article>
          <article className="focus-card">
            <img src="/assets/sustainable_icon.png" alt="Sustainable engineering icon" width="52" height="52" loading="lazy" decoding="async" />
            <h3>Sustainable &amp; Energy-Efficient</h3>
            <p>Equipment and processes engineered to minimize environmental impact and maximize energy conservation.</p>
          </article>
          <article className="focus-card">
            <img src="/assets/blockchain_icon.png" alt="Blockchain transparency icon" width="52" height="52" loading="lazy" decoding="async" />
            <h3>Decentralized Transparency</h3>
            <p>Blockchain-backed traceability and ownership for trusted collaboration across the project lifecycle.</p>
          </article>
        </div>
      </section>

      <section className="industry-focus" aria-labelledby="industry-focus-title">
        <h2 id="industry-focus-title">Solutions Across Multiple Industries</h2>
        <div className="industry-grid">
          <article className="industry-card">
            <h3>Refinery</h3>
            <p>Front-end design to commissioning—efficient crude-to-product workflows with robust safety margins.</p>
          </article>
          <article className="industry-card">
            <h3>Pharma</h3>
            <p>cGMP-aligned equipment and process design for quality, precision and compliance.</p>
          </article>
          <article className="industry-card">
            <h3>Environment</h3>
            <p>Water treatment, waste management and renewable integration for cleaner operations.</p>
          </article>
        </div>
      </section>

      <section className="cta-section" aria-labelledby="project-cta-title">
        <h2 id="project-cta-title">Transform Your Industry Today</h2>
        <p>Discuss your next industrial engineering project with the Engineering Drawing team.</p>
        <div className="cta-buttons">
          <Link to="/contact" className="primary-btn">Contact Us</Link>
          <a href="/assets/Whitepaper_Engineering_Drawing.pdf" download className="secondary-btn">Download White Paper</a>
        </div>
      </section>
    </main>
  );
};

export default ProjectOverview;
