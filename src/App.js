import React from 'react';
import { Routes, Route } from 'react-router-dom';

import Header from './components/Header';
import Footer from './components/Footer';

import Home from './components/Home';
import ProjectOverview from './components/ProjectOverview';
import Tokenomics from './components/Tokenomics';
import Presale from './components/Presale';
import Contact from './components/Contact';

import Evaporators from './components/Evaporators';
import Reactors from "./components/reactor/Reactors";
import Distillation from './components/distillation/Distillation';

/* Category pages (clean slates) */
import IndustrialDesign from './components/IndustrialDesign';
import ConstructionDesign from './components/ConstructionDesign';
import ProcessDesign from './components/ProcessDesign';

import './App.css';

const App = () => {
  return (
    <div className="app-container">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/project-overview" element={<ProjectOverview />} />
        <Route path="/tokenomics" element={<Tokenomics />} />
        <Route path="/presale" element={<Presale />} />
        <Route path="/contact" element={<Contact />} />

        {/* Product */}
        <Route path="/evaporators" element={<Evaporators />} />
        <Route path="/reactors" element={<Reactors />} />
        <Route path="/distillation" element={<Distillation />} />
        {/* Categories */}
        <Route path="/IndustrialDesign" element={<IndustrialDesign />} />
        <Route path="/ConstructionDesign" element={<ConstructionDesign />} />
        <Route path="/ProcessDesign" element={<ProcessDesign />} />
      </Routes>
      <Footer />
    </div>
  );
};

export default App;

