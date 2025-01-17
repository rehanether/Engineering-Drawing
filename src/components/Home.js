// Home.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="homepage">
      {/* Top Section with Introduction and Video */}
      <div className="hero-section">
        <video autoPlay loop muted className="background-video">
          <source src="/assets/industry4.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="introduction-text">
          <h1>Engineering Drawing Project</h1>
          <p>
            We are bringing Industry 4.0 to engineering with state-of-the-art AI-driven design, cost-efficient solutions, and sustainable industrial processes.
          </p>
          
          {/* White Paper Download Button */}
          <a href="/assets/whitepaper.pdf" download>
            <button className="download-button">White Paper</button>
          </a>

          {/* Presale Button */}
          <Link to="/presale">
            <button className="presale-button">Join Presale</button>
          </Link>
        </div>
      </div>

      {/* Categories Section */}
      <div className="categories-section">
        <div className="category industrial">
          <img src="/assets/industrial.gif" alt="Industrial GIF" />
          <h3>Industrial Design</h3>
          <Link to="/distillery">
            <button>Learn More</button>
          </Link>
        </div>

        <div className="category constraction">
          <img src="/assets/construction.gif" alt="Construction GIF" />
          <h3>Construction Design</h3>
          <Link to="/reactors">
            <button>Learn More</button>
          </Link>
        </div>

        <div className="category process">
          <img src="/assets/process.gif" alt="Process GIF" />
          <h3>Process Design</h3>
          <Link to="/evaporators">
            <button>Learn More</button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;
