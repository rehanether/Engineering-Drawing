import React, { lazy, Suspense } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';

import Header from './components/Header';
import Footer from './components/Footer';

import Home from './components/Home';
import Seo from './components/Seo';
import InstallApp from './components/InstallApp';
import './App.css';

const ProjectOverview=lazy(()=>import('./components/ProjectOverview'));
const Tokenomics=lazy(()=>import('./components/Tokenomics'));
const Presale=lazy(()=>import('./components/Presale'));
const Contact=lazy(()=>import('./components/Contact'));
const Evaporators=lazy(()=>import('./components/Evaporators'));
const ReactorSimulator=lazy(()=>import('./components/reactor/ReactorSimulator'));
const Distillation=lazy(()=>import('./components/distillation/DistillationProduction'));
const IndustrialDesign=lazy(()=>import('./components/IndustrialDesign'));
const ConstructionDesign=lazy(()=>import('./components/ConstructionDesign'));
const ProcessDesign=lazy(()=>import('./components/process/ProcessDesign'));
const Privacy=lazy(()=>import('./components/Privacy'));
const FAQ=lazy(()=>import('./components/FAQ'));

const App = () => {
  return (
    <div className="app-container">
      <Seo />
      <Header />
      <InstallApp />
      <Suspense fallback={<main className="route-loading" role="status" aria-live="polite"><span/>Loading engineering workspace…</main>}><Routes>
        <Route path="/" element={<Home />} />
        <Route path="/project-overview" element={<ProjectOverview />} />
        <Route path="/tokenomics" element={<Tokenomics />} />
        <Route path="/presale" element={<Presale />} />
        <Route path="/contact" element={<Contact />} />

        {/* Product */}
        <Route path="/evaporators" element={<Evaporators />} />
        <Route path="/reactors" element={<ReactorSimulator />} />
        <Route path="/distillation" element={<Distillation />} />
        {/* Categories */}
        <Route path="/industrial-design" element={<IndustrialDesign />} />
        <Route path="/construction-design" element={<ConstructionDesign />} />
        <Route path="/process-design" element={<ProcessDesign />} />
        <Route path="/IndustrialDesign" element={<Navigate to="/industrial-design" replace />} />
        <Route path="/ConstructionDesign" element={<Navigate to="/construction-design" replace />} />
        <Route path="/ProcessDesign" element={<Navigate to="/process-design" replace />} />

        <Route path="/privacy" element={<Privacy />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense>
      <Footer />
    </div>
  );
};

export default App;

