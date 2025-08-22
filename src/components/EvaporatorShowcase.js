import React from "react";
import { Link } from "react-router-dom";

export default function EvaporatorShowcase() {
  return (
    <section className="ed-evap-strip">
      <div className="ed-evap-container">
        {/* ONE centered white card containing text + image */}
        <div className="ed-evap-card">
          <div className="ed-evap-copy">
            <h2>AI-generated Design of Evaporator</h2>
            <p>
              Design an MVR evaporator: heat &amp; mass balance,
              heat-transfer area, compressor power, and auto-generated HMBD / P&amp;ID.
            </p>
            <div className="ed-evap-ctas">
              <Link to="/evaporators" className="presale-button">
                Enter Evaporator Designer
              </Link>
            </div>
          </div>

          <div className="ed-evap-visual">
            {/* Use your GIF/WebP; ?v= busts cache */}
            <img
              src="/assets/mvr-evaporator.gif"
              alt="MVR Evaporator animation"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}




