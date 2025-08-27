import React from "react";
import { Link } from "react-router-dom";

export default function ReactorShowcase() {
  return (
    <section className="ed-evap-strip">
      <div className="ed-evap-container">
        <div className="ed-evap-card">
          <div className="ed-evap-copy">
            <h2>AI-generated Design of Reactor</h2>
            <p>
              Size CSTR/PFR/Batch reactors: kinetics → volume, residence time,
              energy balance, heat-transfer area, mixing power, and auto-HMBD/P&amp;ID.
            </p>
            <div className="ed-evap-ctas">
              <Link to="/reactors" className="presale-button">
                Enter Reactor Designer
              </Link>
            </div>
          </div>

          <div className="ed-evap-visual">
            {/* drop your animation here */}
            <img
              src="/assets/reactor.gif"
              alt="CSTR/PFR reactor animation"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
