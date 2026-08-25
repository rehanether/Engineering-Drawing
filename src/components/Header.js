// Header.js
import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';
import './Header.css';

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <div className="logo-container">
        <Link className="site-brand" to="/" aria-label="Engineering Drawing home">
          <img src={logo} alt="" className="logo" />
          <span className="site-brand-name">Engineering Drawing</span>
        </Link>
        <button className="menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-controls="primary-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen((current) => !current)}>
          <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        </button>
      </div>
      <nav id="primary-navigation" aria-label="Primary navigation" className={menuOpen ? "nav-open" : ""}>
        <ul>
          <li><Link to="/" onClick={() => setMenuOpen(false)}>Home</Link></li>
          <li><Link to="/project-overview" onClick={() => setMenuOpen(false)}>Project Overview</Link></li>
          <li><Link to="/tokenomics" onClick={() => setMenuOpen(false)}>Tokenomics</Link></li>
          <li><Link to="/presale" onClick={() => setMenuOpen(false)}>Presale</Link></li>
          <li><Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link></li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
