import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

function FooterIcon({ name }) {
  const paths = {
    Facebook: 'M14 21v-8h3l.5-4H14V7c0-1 .3-2 2-2h2V1.5A25 25 0 0 0 15 1c-3 0-5 2-5 5v3H7v4h3v8',
    LinkedIn: 'M4 9v12M4 4v.1M10 21V9h5v2c1-3 6-3 6 2v8M10 9v12',
    GitHub: 'M9 21v-3c-4 1-4-2-6-2m12 5v-4c0-1-.3-2-1-2 4-.5 6-2 6-6 0-1-.4-2-1-3 0-1 0-2-.3-3-2 0-3 1-4 1a12 12 0 0 0-6 0C8 3 7 3 5 3c-.3 1-.3 2 0 3-1 1-1 2-1 3 0 4 2 5.5 6 6-.7.5-1 1-1 2',
    Email: 'M3 5h18v14H3zM3 5l9 8 9-8',
    FAQ: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4v.1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
    Privacy: 'M12 2l8 3v6c0 5-4 8-8 11-4-3-8-6-8-11V5zM8 12l3 3 5-6',
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src="/assets/edg_logo.svg" width="32" height="32" alt="Engineering Drawing" />
        <p>&copy; {new Date().getFullYear()} Engineering Drawing. All rights reserved.</p>
      </div>
      <div className="social-links">
        <Link to="/faq"><FooterIcon name="FAQ"/>FAQ</Link>
        <Link to="/privacy"><FooterIcon name="Privacy"/>Privacy</Link>
        <a href="mailto:contact@engineeringdrawing.io" title="Official contact email"><FooterIcon name="Email"/>contact@engineeringdrawing.io</a>
        <a href="https://github.com/rehanether/Engineering-Drawing" target="_blank" rel="noopener noreferrer"><FooterIcon name="GitHub"/>GitHub</a>
        <a href="https://www.linkedin.com/company/engineeringdrawing" target="_blank" rel="noopener noreferrer"><FooterIcon name="LinkedIn"/>LinkedIn</a>
        <a href="https://www.facebook.com/profile.php?id=61579977430470" target="_blank" rel="noopener noreferrer"><FooterIcon name="Facebook"/>Facebook</a>
      </div>
    </footer>
  );
}

export default Footer;
