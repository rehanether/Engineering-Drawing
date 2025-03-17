import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import ProjectOverview from './components/ProjectOverview';
import Tokenomics from './components/Tokenomics';
import Presale from './components/Presale';
import Contact from './components/Contact';
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
      </Routes>
      <Footer />
    </div>
  );
};

export default App;
