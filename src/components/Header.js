// Header.js
import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import './Header.css';

function Header() {
  return (
    <header>
      <img src={logo} alt="Engineering Drawing Logo" className="logo" />
      <h1>Engineering Drawing</h1>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/project-overview">Project Overview</Link>
        <Link to="/tokenomics">Tokenomics</Link>
        <Link to="/presale">Presale</Link>
        <Link to="/education-foundation">Education</Link>
        <Link to="/contact">Contact</Link>
      </nav>
    </header>
  );
}

export default Header;
