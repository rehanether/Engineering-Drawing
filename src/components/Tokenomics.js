import React, { useEffect, useState } from 'react';
import './Tokenomics.css';

const Tokenomics = () => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    // Countdown Timer Logic
    const countdownDate = new Date("2025-03-31T00:00:00").getTime();
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = countdownDate - now;

      if (distance < 0) {
        setTimeLeft("Presale Ended");
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      }
    };

    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="tokenomics-page container">
      {/* Hero Section */}
      <div className="hero-section">
        <h1>Engineering Drawing Project Tokenomics</h1>
        <p>Empowering transparency, sustainability, and community through the EDG token on the BNB blockchain.</p>
      </div>

      {/* Presale Stages Section */}
      <div className="presale-section">
        <h2>Presale Stages</h2>
        <div className="countdown-timer">
          <p>Presale Countdown: <span>{timeLeft}</span></p>
        </div>
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
            <h3>Environment Program - 30%</h3>
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
    </div>
  );
};

export default Tokenomics;
