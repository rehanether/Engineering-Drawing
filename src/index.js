import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement); // New React 18 API

root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
