import React from "react";
import { Link } from "react-router-dom";

export default function DistillationShowcase() {
  return (
    <section className="ed-evap-strip">
      <div className="ed-evap-container">
        <div className="ed-evap-card">
          <div className="ed-evap-copy">
            <h2>AI-generated Design of Distillation Column</h2>
            <p>
              Fenske–Underwood–Gilliland sizing, reflux selection, energy balance,
              and auto-generated HMBD / P&amp;ID.
            </p>
            <div className="ed-evap-ctas">
              <Link to="/distillation" className="presale-button">
                Enter Distillation Designer
              </Link>
            </div>
          </div>

          <div className="ed-evap-visual">
            {/* add your matching line-art GIF here */}
            <img
              src="/assets/distillation.gif"
              alt="Distillation column animation"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
