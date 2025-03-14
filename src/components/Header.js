// Header.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import './Header.css';

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header>
      <div className="logo-container">
        <img src={logo} alt="Engineering Drawing Logo" className="logo" />
        <h1>Engineering Drawing</h1>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>
      </div>
      <nav className={menuOpen ? "nav-open" : ""}>
        <ul>
          <li><Link to="/" onClick={() => setMenuOpen(false)}>Home</Link></li>
          <li><Link to="/project-overview" onClick={() => setMenuOpen(false)}>Project Overview</Link></li>
          <li><Link to="/tokenomics" onClick={() => setMenuOpen(false)}>Tokenomics</Link></li>
          <li><Link to="/presale" onClick={() => setMenuOpen(false)}>Presale</Link></li>
          <li><Link to="/education-foundation" onClick={() => setMenuOpen(false)}>Education</Link></li>
          <li><Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link></li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
