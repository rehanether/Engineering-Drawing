import React from 'react';
import { Link } from 'react-router-dom';
import './Home.ed.css';
import EvaporatorShowcase from './EvaporatorShowcase';

const Home = () => {
  return (
    <div className="homepage">
      {/* Hero */}
      <div className="hero-section">
        <video autoPlay loop muted className="background-video">
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

      {/* Categories */}
      <div className="categories-section">
        <div className="category industrial">
          <img src="/assets/industrial.gif" alt="Industrial GIF" />
          <h3>Industrial Design</h3>
          <Link to="/IndustrialDesign">
            <button>Learn More</button>
          </Link>
        </div>

        <div className="category constraction">
          <img src="/assets/construction.gif" alt="Construction GIF" />
          <h3>Construction Design</h3>
          <Link to="/ConstructionDesign">
            <button>Learn More</button>
          </Link>
        </div>

        <div className="category process">
          <img src="/assets/process.gif" alt="Process GIF" />
          <h3>Process Design</h3>
          <Link to="/ProcessDesign">
            <button>Learn More</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
