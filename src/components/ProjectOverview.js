import React from 'react';
import './ProjectOverview.css';

const ProjectOverview = () => {
  return (
    <div className="project-overview">
      {/* Hero Section */}
      <div className="hero-section">
        <h1>Engineering Excellence through Industry 4.0</h1>
        <p>Revolutionizing industrial design with transparency, sustainability, and efficiency.</p>

        {/* Replaced static image with your GIF */}
        <img
          src="/assets/hero-industry.gif"
          alt="Industry 4.0 animation"
          className="hero-image"
        />
      </div>

      {/* Core Focus */}
      <section className="core-focus">
        <h2>Our Core Focus</h2>
        <div className="focus-grid">
          <div className="focus-card">
            <img src="/assets/industry4_icon.png" alt="Industry 4.0" />
            <h3>Industry 4.0 Solutions</h3>
            <p>Advanced automation and data-driven design for smarter, interconnected, and self-optimizing plants.</p>
          </div>
          <div className="focus-card">
            <img src="/assets/sustainable_icon.png" alt="Sustainable Design" />
            <h3>Sustainable & Energy-Efficient</h3>
            <p>Equipment and processes engineered to minimize environmental impact and maximize energy conservation.</p>
          </div>
          <div className="focus-card">
            <img src="/assets/blockchain_icon.png" alt="Blockchain Transparency" />
            <h3>Decentralized Transparency</h3>
            <p>Blockchain-backed traceability and ownership for trusted collaboration across the project lifecycle.</p>
          </div>
        </div>
      </section>

      {/* Industry Focus */}
      <section className="industry-focus">
        <h2>Solutions Across Multiple Industries</h2>
        <div className="industry-grid">
          <div className="industry-card">
            <h3>Refinery</h3>
            <p>Front-end design to commissioning—efficient crude-to-product workflows with robust safety margins.</p>
          </div>
          <div className="industry-card">
            <h3>Pharma</h3>
            <p>cGMP-aligned equipment and process design for quality, precision, and compliance.</p>
          </div>
          <div className="industry-card">
            <h3>Environment</h3>
            <p>Water treatment, waste management, and renewable integration for cleaner operations.</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <h2>Transform Your Industry Today</h2>
        <div className="cta-buttons">
          <button className="primary-btn">Contact Us</button>
          <a href="/assets/whitepaper_Engineering_Drawing.pdf" download className="secondary-btn">Download White Paper</a>
        </div>
      </section>
    </div>
  );
};

export default ProjectOverview;






