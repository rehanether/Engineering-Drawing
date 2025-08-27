import React from "react";
import "./IndustrialDesign.css";

export default function IndustrialDesign() {
  return (
    <main className="id-shell">
      <div className="id-head">
        <h1>Industrial Design</h1>
        <p className="id-sub">
          Pick a designer to get instant sizing, energy balance, utilities, and auto-generated HMBD / P&amp;ID.
        </p>
      </div>

      {/* 01 — Evaporator */}
      <section className="id-card">
        <div className="id-card__text">
          <span className="id-num">01</span>
          <h2>AI-generated Design of Evaporator</h2>
          <p>
            Design an MVR evaporator: heat &amp; mass balance, heat-transfer area, compressor power,
            and HMBD / P&amp;ID export.
          </p>
          <a className="id-btn" href="/evaporators">Enter Evaporator Designer</a>
        </div>
        <div className="id-card__art" aria-hidden="true">
          {/* minimal compact icon */}
          <svg viewBox="0 0 160 120">
            <defs>
              <style>{`.i{fill:none;stroke:#111827;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}`}</style>
            </defs>
            <rect x="28" y="26" width="72" height="60" rx="8" className="i" />
            <path d="M100 56 h34" className="i" />
            <circle cx="134" cy="56" r="12" className="i" />
            <path d="M36 66c10-10 20 10 30 0 10-10 20 10 30 0" stroke="#5b9af5" fill="none" strokeWidth="4"/>
          </svg>
        </div>
      </section>

      {/* 02 — Reactor */}
      <section className="id-card">
        <div className="id-card__text">
          <span className="id-num">02</span>
          <h2>AI-generated Design of Reactor</h2>
          <p>
            Size CSTR/PFR/Batch reactors: kinetics → volume, residence time, energy balance,
            heat-transfer area, mixing power, and auto-HMBD/P&amp;ID.
          </p>
          <a className="id-btn" href="/reactors">Enter Reactor Designer</a>
        </div>
        <div className="id-card__art" aria-hidden="true">
          <svg viewBox="0 0 160 120">
            <defs>
              <style>{`.i{fill:none;stroke:#111827;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}`}</style>
            </defs>
            <rect x="28" y="26" width="72" height="60" rx="8" className="i" />
            <circle cx="64" cy="56" r="10" className="i" />
            <path d="M28 56H14" className="i" />
            <path d="M100 56H144" className="i" />
            <path d="M64 26v22" className="i" />
            <path d="M64 66v20" className="i" />
          </svg>
        </div>
      </section>

      {/* 03 — Distillation */}
      <section className="id-card">
        <div className="id-card__text">
          <span className="id-num">03</span>
          <h2>AI-generated Design of Distillation Column</h2>
          <p>
            FUG sizing (Fenske–Underwood–Gilliland), reflux selection, energy balance,
            utilities, and auto-generated HMBD / P&amp;ID.
          </p>
          <a className="id-btn" href="/distillation">Enter Distillation Designer</a>
        </div>
        <div className="id-card__art" aria-hidden="true">
          <svg viewBox="0 0 160 120">
            <defs>
              <style>{`.i{fill:none;stroke:#111827;stroke-width:4;stroke-linecap:round;stroke-linejoin:round}`}</style>
            </defs>
            <rect x="42" y="18" width="48" height="84" rx="8" className="i" />
            <line x1="42" y1="42" x2="90" y2="42" className="i" />
            <line x1="42" y1="64" x2="90" y2="64" className="i" />
            <line x1="42" y1="86" x2="90" y2="86" className="i" />
            <path d="M90 58 h42" className="i" />
            <rect x="132" y="50" width="16" height="16" rx="3" className="i" />
            <path d="M120 36 h28" stroke="#2563eb" strokeWidth="4" strokeDasharray="6 6" fill="none" />
          </svg>
        </div>
      </section>
    </main>
  );
}




