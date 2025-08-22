// src/components/Evaporators.js
import React, { useState } from "react";
import "./Evaporators.css";
import GeneratedDiagram from "./GeneratedDiagram";

const Evaporators = () => {
  const [formData, setFormData] = useState({
    feedCapacity: "",
    feedTemp: "",
    feedConc: "",
    finalConc: "",
    feedDensity: "", // UI only
    cod: "",
    industry: "",
    product: "",
  });

  const [results, setResults] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
  };

  /* ---- calc helpers ---- */
  const calcThermalLoads = (feedFlow, deltaT, Cp, vaporFlow, latentHeat) => {
    const sensibleHeat = (feedFlow * deltaT * Cp) / 4.186; // kcal/h
    const latentHeatTotal = vaporFlow * latentHeat;        // kcal/h
    const totalHeatKW = (sensibleHeat + latentHeatTotal) / 860; // kW
    return { sensibleHeat, latentHeatTotal, totalHeatKW };
  };

  const calcAreaAndPower = (totalHeatKW, deltaT, U, vaporFlow) => {
    const area = (totalHeatKW * 1000) / (U * deltaT); // m²
    const areaWithMargin = area * 1.15;
    const compressorPower = ((vaporFlow * 0.48 * 10) / 0.7) / 860; // kW (rough)
    return { area, areaWithMargin, compressorPower };
  };

  const calculateDesign = ({ feedCapacity, feedTemp, feedConc, finalConc }) => {
    const Cp = 4.16;      // kJ/kg·K
    const latentHeat = 540; // kcal/kg
    const U = 1784;       // W/m²·K

    const feedCap = Number(feedCapacity) || 2;   // TPD
    const fTemp = Number(feedTemp) || 50;        // °C
    const fConc = Number(feedConc) || 1.0;       // %
    const finConc = Number(finalConc) || 15.0;   // %

    const deltaT = 60 - fTemp;
    const feedFlow = (feedCap * 1000) / 24; // kg/h
    const productFlow = (feedFlow * fConc) / finConc;
    const vaporFlow = feedFlow - productFlow;

    const { sensibleHeat, latentHeatTotal, totalHeatKW } =
      calcThermalLoads(feedFlow, deltaT, Cp, vaporFlow, latentHeat);

    const { area, areaWithMargin, compressorPower } =
      calcAreaAndPower(totalHeatKW, deltaT, U, vaporFlow);

    const recycle = vaporFlow * 0.05;
    const condensate = vaporFlow - recycle;

    return {
      feedFlow: feedFlow.toFixed(2),
      productFlow: productFlow.toFixed(2),
      vaporFlow: vaporFlow.toFixed(2),
      sensibleHeat: sensibleHeat.toFixed(2),
      latentHeat: latentHeatTotal.toFixed(2),
      totalHeatKW: totalHeatKW.toFixed(2),
      area: area.toFixed(2),
      areaWithMargin: areaWithMargin.toFixed(2),
      compressorPower: compressorPower.toFixed(2),
      recycle: recycle.toFixed(2),
      condensate: condensate.toFixed(2),
      sizingParams: {
        heatTransferCoeff: U,
        deltaT,
        heatLoadKW: totalHeatKW.toFixed(2),
        area: area.toFixed(2),
        areaWithMargin: areaWithMargin.toFixed(2),
      },
    };
  };

  const handleSubmit = () => {
    const designResults = calculateDesign(formData);
    setResults(designResults);
  };

  return (
    <div className="product-detail evaporators-content">
      <h1>MVR Evaporator Design</h1>

      {/* Input form */}
      <div className="form-section">
        <label>
          Feed Capacity (TPD):
          <input type="number" name="feedCapacity" onChange={handleChange} />
        </label>
        <label>
          Feed Temp (°C):
          <input type="number" name="feedTemp" onChange={handleChange} />
        </label>
        <label>
          Feed Concentration (%):
          <input type="number" name="feedConc" onChange={handleChange} />
        </label>
        <label>
          Final Concentration (%):
          <input type="number" name="finalConc" onChange={handleChange} />
        </label>
        <label>
          Feed Density (kg/m³):
          <input type="number" name="feedDensity" onChange={handleChange} />
        </label>
        <label>
          COD (mg/L):
          <input type="number" name="cod" onChange={handleChange} />
        </label>
        <label>
          Industry:
          <input type="text" name="industry" onChange={handleChange} />
        </label>
        <label>
          Product:
          <input type="text" name="product" onChange={handleChange} />
        </label>
        <button onClick={handleSubmit}>Generate Design</button>
      </div>

      {/* Results + PFD only */}
      {results && (
        <>
          <div className="results-section">
            <h2>Evaporator Design Summary</h2>
            <ul>
              <li>Feed Flow: {results.feedFlow} kg/h</li>
              <li>Product Flow: {results.productFlow} kg/h</li>
              <li>Evaporated Flow: {results.vaporFlow} kg/h</li>
              <li>Sensible Heat: {results.sensibleHeat} kcal/h</li>
              <li>Latent Heat: {results.latentHeat} kcal/h</li>
              <li>Total Heat Load: {results.totalHeatKW} kW</li>
              <li>Heat Transfer Area: {results.area} m²</li>
              <li>Design Area with Margin: {results.areaWithMargin} m²</li>
              <li>MVR Compressor Power: {results.compressorPower} kW</li>
            </ul>

            <h3>Sizing Parameters</h3>
            <ul>
              <li>U (W/m²·K): {results.sizingParams.heatTransferCoeff}</li>
              <li>ΔT (°C): {results.sizingParams.deltaT}</li>
              <li>Heat Load (kW): {results.sizingParams.heatLoadKW}</li>
              <li>Required Area (m²): {results.sizingParams.area}</li>
              <li>Area with 15% Margin (m²): {results.sizingParams.areaWithMargin}</li>
            </ul>
          </div>

          <div className="diagram-container">
            <GeneratedDiagram results={results} />
          </div>
        </>
      )}
    </div>
  );
};

export default Evaporators;







