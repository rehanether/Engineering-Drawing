import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src="/assets/edg_logo.svg" width="32" height="32" alt="Engineering Drawing" />
        <p>&copy; {new Date().getFullYear()} Engineering Drawing. All rights reserved.</p>
      </div>
      <div className="social-links">
        <Link to="/faq">FAQ</Link>
        <Link to="/privacy">Privacy</Link>
        <a href="mailto:contact@engineeringdrawing.io" title="Official contact email">contact@engineeringdrawing.io</a>
        <a href="https://github.com/rehanether/Engineering-Drawing" target="_blank" rel="noopener noreferrer">GitHub</a>
        <a href="https://www.linkedin.com/company/engineeringdrawing" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      </div>
    </footer>
  );
}

export default Footer;
