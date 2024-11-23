import React from 'react';
import './EducationFoundation.css';
import foundationImage from '../assets/logo.png';

const EducationFoundation = () => {
  return (
    <div className="education-container">
      <h2 className="education-header">Education Foundation Program</h2>
      <div className="education-content">
        <img
          className="education-image"
          src={foundationImage}
          alt="Education Foundation"
        />
        <p className="education-description">
          We collaborate with industry experts to develop and host seminars,
          exhibitions, podcasts, and live sessions that share knowledge and
          foster growth for mankind. The program is open to participants at
          all levels, welcoming every human being to benefit from these
          initiatives.
          <br />
          We are allocated 30% of our tokens on the BNB chain for this program,
          ensuring that participants can directly benefit from these shares.
          Let's make chemistry great again!
        </p>
        <div className="education-features">
          <div className="feature-card">
            <h3>Seminars & Webinars</h3>
            <p>Participate in expert-led seminars and webinars designed to educate and empower.</p>
          </div>
          <div className="feature-card">
            <h3>Podcasts & Live Sessions</h3>
            <p>Join insightful discussions with industry leaders and get hands-on experience.</p>
          </div>
          <div className="feature-card">
            <h3>Skill Development</h3>
            <p>Gain skills through training programs focused on real-world applications and developments.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationFoundation;
