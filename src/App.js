import React from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';

import Header from './components/Header';
import Footer from './components/Footer';

import Home from './components/Home';
import ProjectOverview from './components/ProjectOverview';
import Tokenomics from './components/Tokenomics';
import Presale from './components/Presale';
import Contact from './components/Contact';

import Evaporators from './components/Evaporators';
import ReactorSimulator from "./components/reactor/ReactorSimulator";
import Distillation from './components/distillation/Distillation';

/* Category pages (clean slates) */
import IndustrialDesign from './components/IndustrialDesign';
import ConstructionDesign from './components/ConstructionDesign';
import ProcessDesign from './components/process/ProcessDesign';
import Seo from './components/Seo';
import InstallApp from './components/InstallApp';

import Privacy from "./components/Privacy";
import FAQ from "./components/FAQ";

import './App.css';

const App = () => {
  return (
    <div className="app-container">
      <Seo />
      <Header />
      <InstallApp />
      <Routes>
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
      </Routes>
      <Footer />
    </div>
  );
};

export default App;

