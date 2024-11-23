import React from 'react';
import './Tokenomics.css';

const Tokenomics = () => {
  return (
    <div className="tokenomics-page container">
      {/* Hero Section */}
      <div className="hero-section">
        <h1>Engineering Drawing Project Tokenomics</h1>
        <p>Empowering transparency, sustainability, and community through the EDG token on the BNB blockchain.</p>
      </div>

      {/* Token Allocation Overview Section */}
      <div className="token-allocation-section">
        <h2>Token Allocation Overview</h2>
        <div className="allocation-chart-container">
          <canvas id="tokenChart"></canvas>
        </div>
        <div className="token-details">
          <div className="detail">
            <strong>Total Supply:</strong> 10 Million EDG
          </div>
          <div className="detail">
            <strong>Blockchain:</strong> Binance Smart Chain (BSC)
          </div>
        </div>
      </div>

      {/* Presale Stages Section */}
      <div className="presale-section">
        <h2>Presale Stages</h2>
        <div className="stages-container">
          <div className="stage-card">
            <h3>Stage 1: 5% Tokens</h3>
            <p>Price: 0.01 USDT/USD</p>
            <progress value="40" max="100"></progress>
          </div>
          <div className="stage-card">
            <h3>Stage 2: 10% Tokens</h3>
            <p>Price: 0.02 USDT/USD</p>
            <progress value="0" max="100"></progress>
          </div>
          <div className="stage-card">
            <h3>Stage 3: 15% Tokens</h3>
            <p>Price: 0.03 USDT/USD</p>
            <progress value="0" max="100"></progress>
          </div>
        </div>
        <div className="countdown-timer">
          <p>Presale Countdown: <span id="countdown-timer"></span></p>
        </div>
      </div>

      {/* Detailed Token Allocation Section */}
      <div className="allocation-details-section">
        <h2>Token Allocation Breakdown</h2>
        <div className="allocation-cards-container">
          <div className="allocation-card">
            <img src="/assets/community.png" alt="Community Icon" />
            <h3>Community Development - 25%</h3>
            <p>Supporting community growth through token presale, empowering our supporters.</p>
          </div>
          <div className="allocation-card">
            <img src="/assets/skill-development.png" alt="Skill Development Icon" />
            <h3>Skilled Development Program - 30%</h3>
            <p>Locked for 3 years to promote industry skill development, with gradual unlocking of 10% per year.</p>
          </div>
          <div className="allocation-card">
            <img src="/assets/team.png" alt="Team Icon" />
            <h3>Team & Management - 15%</h3>
            <p>Locked for 3 years, with 5% unlocking each year to ensure dedicated and long-term commitment.</p>
          </div>
          <div className="allocation-card">
            <img src="/assets/marketing.png" alt="Marketing Icon" />
            <h3>Marketing & Promotional - 10%</h3>
            <p>For brand awareness and community engagement, driving growth and recognition.</p>
          </div>
          <div className="allocation-card">
            <img src="/assets/liquidity.png" alt="Liquidity Icon" />
            <h3>Liquidity & Risk Management - 20%</h3>
            <p>Locked for liquidity stability, ensuring smooth operation and risk management.</p>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="timeline-section">
        <h2>Project Timeline</h2>
        <div className="timeline-container">
          <div className="timeline-event">
            <h4>Presale Begins</h4>
            <p>Get in early and participate in our token presale for community growth and development.</p>
          </div>
          <div className="timeline-event">
            <h4>Stage Completion & Binance Listing</h4>
            <p>With each presale stage completed, we get closer to listing EDG on Binance.</p>
          </div>
          <div className="timeline-event">
            <h4>Binance Listing (6 Months)</h4>
            <p>Our goal is to list EDG on Binance, with an estimated price of 0.05 USDT/USD after 6 months.</p>
          </div>
          <div className="timeline-event">
            <h4>Unlock Schedule for Team & Skills Program</h4>
            <p>Token unlocking begins gradually post-listing, encouraging long-term project commitment.</p>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="cta-section">
        <button className="join-presale-button">Join the Presale Now</button>
      </div>
    </div>
  );
};

export default Tokenomics;

