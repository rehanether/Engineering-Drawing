import React from 'react';
import './HmbDiagram.css';

const HmbDiagram = ({ results }) => {
  if (!results) return null;

  return (
    <div className="hmb-container">
      <h2>Heat and Mass Balance Diagram</h2>
      <div className="hmb-diagram">
        <div className="box feed">
          <p>Feed</p>
          <p>{results.feedFlow} kg/h</p>
        </div>

        <div className="arrow">→</div>

        <div className="box evap">
          <p>Evaporator</p>
          <p>ΔT = {results.sizingParams.deltaT} °C</p>
          <p>Area = {results.area} m²</p>
        </div>

        <div className="arrow">→</div>

        <div className="box product">
          <p>Product</p>
          <p>{results.productFlow} kg/h</p>
        </div>

        <div className="arrow recycle-up">↗</div>

        <div className="box vapor">
          <p>Vapor</p>
          <p>{results.vaporFlow} kg/h</p>
        </div>

        <div className="arrow">→</div>

        <div className="box condensate">
          <p>Condensate</p>
          <p>{results.condensate} kg/h</p>
        </div>
      </div>
    </div>
  );
};

export default HmbDiagram;

