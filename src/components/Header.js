// Header.js
import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png'; // Ensure the logo is in the correct path
import './Header.css';

function Header() {
  return (
    <header>
      <div className="logo-container">
        <img src={logo} alt="Engineering Drawing Logo" className="logo" />
        <h1>Engineering Drawing</h1>
      </div>
      <nav>
        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/project-overview">Project Overview</Link></li>
          <li><Link to="/tokenomics">Tokenomics</Link></li>
          <li><Link to="/presale">Presale</Link></li>
          <li><Link to="/education-foundation">Education</Link></li>
          <li><Link to="/contact">Contact</Link></li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
