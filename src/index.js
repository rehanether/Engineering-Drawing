// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './components/Header.css';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const root = createRoot(document.getElementById('root'));

root.render(
  <BrowserRouter>
    <App />
    <Analytics />
    <SpeedInsights />
  </BrowserRouter>
);
