import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="homepage">
      {/* Top Section with Introduction and Video */}
      <div className="hero-section">
        <div className="introduction-text">
          <h1>Engineering Drawing Project</h1>
          <p>
            We are bringing Industry 4.0 to engineering with state-of-the-art AI-driven design, cost-efficient solutions, and sustainable industrial processes.
          </p>
          
          {/* White Paper Download Button */}
          <a href="/assets/whitepaper.pdf" download>
            <button className="download-button">Download White Paper</button>
          </a>
        </div>
        <div className="video-container">
          <video autoPlay loop muted className="background-video">
            <source src="/assets/industry4.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
        <div className="overlay-text">
          <h2>Industry 4.0 Solutions</h2>
        </div>
      </div>

      {/* Categories Section */}
      <div className="categories-section">
        <div className="category distillery">
          <img src="/assets/distillery.gif" alt="Distillery GIF" />
          <h3>Distillery</h3>
          <Link to="/distillery">
            <button>Learn More</button>
          </Link>
        </div>

        <div className="category reactors">
          <img src="/assets/reactor.gif" alt="Reactors GIF" />
          <h3>Reactors</h3>
          <Link to="/reactors">
            <button>Learn More</button>
          </Link>
        </div>

        <div className="category evaporators">
          <img src="/assets/evaporator.gif" alt="Evaporators GIF" />
          <h3>Evaporators</h3>
          <Link to="/evaporators">
            <button>Learn More</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
