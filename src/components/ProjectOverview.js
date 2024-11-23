import React from 'react';
import './ProjectOverview.css';

const ProjectOverview = () => {
  return (
    <div className="project-overview">
      {/* Hero Section */}
      <div className="hero-section">
        <h1>Engineering Excellence through Industry 4.0</h1>
        <p>Revolutionizing industrial design with transparency, sustainability, and efficiency.</p>
        <img src="/assets/industry4_overview.jpg" alt="Industry 4.0 Overview" className="hero-image" />
      </div>

      {/* Core Focus Areas */}
      <div className="core-focus">
        <h2>Our Core Focus</h2>
        <div className="focus-card">
          <img src="/assets/industry4_icon.png" alt="Industry 4.0" />
          <h3>Industry 4.0 Solutions</h3>
          <p>Incorporating advanced technology to make industrial design smarter, interconnected, and automated.</p>
        </div>
        <div className="focus-card">
          <img src="/assets/sustainable_icon.png" alt="Sustainable Design" />
          <h3>Sustainable and Energy-Efficient Design</h3>
          <p>Designing equipment and processes that minimize environmental impact and maximize energy conservation.</p>
        </div>
        <div className="focus-card">
          <img src="/assets/blockchain_icon.png" alt="Decentralized Process" />
          <h3>Decentralized and Transparent Process</h3>
          <p>Leveraging blockchain technology for transparency and decentralized ownership, improving trust and collaboration.</p>
        </div>
      </div>

      {/* Industry Focus */}
      <div className="industry-focus">
        <h2>Solutions Across Multiple Industries</h2>
        <div className="industry-card">
          <h3>Refinery Industry</h3>
          <p>Complete plant design for efficient refinery processes, from raw materials to final products.</p>
        </div>
        <div className="industry-card">
          <h3>Pharma Industry</h3>
          <p>Pharmaceutical manufacturing equipment design and implementation, ensuring the highest standards of safety and precision.</p>
        </div>
        <div className="industry-card">
          <h3>Environment Industry</h3>
          <p>Innovative solutions for water treatment, waste management, and renewable energy systems.</p>
        </div>
      </div>

      {/* Call to Action */}
      <div className="call-to-action">
        <h2>Transform Your Industry Today</h2>
        <button className="contact-button">Contact Us</button>
        <button className="download-button">Download Our White Paper</button>
      </div>
    </div>
  );
};

export default ProjectOverview;
