import React from 'react';
import { Link } from 'react-router-dom';
import './Home.ed.css';
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
        <div className="hero-equipment" aria-label="Industrial design simulators">
          <Link to="/evaporators"><img src="/assets/mvr-evaporator.gif" alt="" /><span>MVR Evaporator</span><small>Live HMBD · PFD · 3D plant</small></Link>
          <Link to="/reactors"><img src="/assets/reactor.gif" alt="" /><span>Industrial Reactor</span><small>Feed basis · kinetics · 3D plant</small></Link>
          <Link to="/distillation"><img src="/assets/distillation.gif" alt="" /><span>Distillation Column</span><small>Separation · utilities · 3D plant</small></Link>
        </div>
      </div>

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
