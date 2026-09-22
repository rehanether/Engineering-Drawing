import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';
import logo from '../assets/logo.png';

function FooterIcon({ name }) {
  const paths = {
    Facebook: 'M14 21v-8h3l.5-4H14V7c0-1 .3-2 2-2h2V1.5A25 25 0 0 0 15 1c-3 0-5 2-5 5v3H7v4h3v8',
    LinkedIn: 'M4 9v12M4 4v.1M10 21V9h5v2c1-3 6-3 6 2v8M10 9v12',
    GitHub: 'M9 21v-3c-4 1-4-2-6-2m12 5v-4c0-1-.3-2-1-2 4-.5 6-2 6-6 0-1-.4-2-1-3 0-1 0-2-.3-3-2 0-3 1-4 1a12 12 0 0 0-6 0C8 3 7 3 5 3c-.3 1-.3 2 0 3-1 1-1 2-1 3 0 4 2 5.5 6 6-.7.5-1 1-1 2',
    Email: 'M3 5h18v14H3zM3 5l9 8 9-8',
    WhatsApp: 'M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5ZM8.2 8.4c.2-.5.4-.5.7-.5h.5c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5 0 .7l-.5.7c.7 1.3 1.7 2.3 3 3l.7-.5c.2-.1.5-.1.7 0l1.8.8c.3.1.4.3.4.5v.5c0 .3-.1.5-.5.7-.6.3-1.4.3-2.3 0-2.8-1-5.2-3.4-6.2-6.2-.3-.9-.3-1.7 0-2.3Z',
    Telegram: 'M21 3 3 10l7 2 2 7 3-5 4 3 2-14ZM10 13l7-6-5 7',
    X: 'M4 4l16 16M20 4 4 20',
    FAQ: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4v.1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
    Privacy: 'M12 2l8 3v6c0 5-4 8-8 11-4-3-8-6-8-11V5zM8 12l3 3 5-6',
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <img src={logo} width="32" height="32" alt="Engineering Drawing" />
        <p>&copy; {new Date().getFullYear()} Engineering Drawing. All rights reserved.</p>
      </div>
      <nav className="social-links" aria-label="Engineering Drawing links">
        <Link to="/faq" aria-label="FAQ" title="FAQ"><FooterIcon name="FAQ"/></Link>
        <Link to="/privacy" aria-label="Privacy" title="Privacy"><FooterIcon name="Privacy"/></Link>
        <a href="mailto:contact@engineeringdrawing.io" aria-label="Email Engineering Drawing" title="contact@engineeringdrawing.io"><FooterIcon name="Email"/></a>
        <a href="https://wa.me/919472187321" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp Engineering Drawing" title="WhatsApp: +91 94721 87321"><FooterIcon name="WhatsApp"/></a>
        <a href="https://t.me/+919472187321" target="_blank" rel="noopener noreferrer" aria-label="Telegram Engineering Drawing" title="Telegram: +91 94721 87321"><FooterIcon name="Telegram"/></a>
        <a href="https://x.com/EnggDrawIO" target="_blank" rel="noopener noreferrer" aria-label="Engineering Drawing on X" title="X: @EnggDrawIO"><FooterIcon name="X"/></a>
        <a href="https://github.com/rehanether/Engineering-Drawing" target="_blank" rel="noopener noreferrer" aria-label="Engineering Drawing on GitHub" title="GitHub"><FooterIcon name="GitHub"/></a>
        <a href="https://www.linkedin.com/company/engineeringdrawing/" target="_blank" rel="noopener noreferrer" aria-label="Engineering Drawing on LinkedIn" title="LinkedIn"><FooterIcon name="LinkedIn"/></a>
        <a href="https://www.facebook.com/profile.php?id=61579977430470" target="_blank" rel="noopener noreferrer" aria-label="Engineering Drawing on Facebook" title="Facebook"><FooterIcon name="Facebook"/></a>
      </nav>
    </footer>
  );
}

export default Footer;
