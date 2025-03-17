// components/Home.js
// Footer.js
import React from 'react';
import './Footer.css';

function Footer() {
  return (
    <footer>
      <p>&copy; {new Date().getFullYear()} Engineering Drawing. All rights reserved.</p>
      <div className="social-links">
        <a href="https://www.linkedin.com/company/engineeringdrawing" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a href="https://github.com/rehanether/Engineering-Drawing" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
    </footer>
  );
}

export default Footer;
