import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Tokenomics.css";

function usePresaleStats() {
  const [stats, setStats] = useState({
    stage1: { sold: 0, total: 4_999_995 },
    stage2: { sold: 0, total: 9_999_999 },
    stage3: { sold: 0, total: 14_999_985 },
  });

  useEffect(() => {
    try {
      const defaults = {
        stage1: 4_999_995,
        stage2: 9_999_999,
        stage3: 14_999_985,
      };
      const presale = window.__EDG_PRESALE__;
      if (presale?.stage1 && presale?.stage2 && presale?.stage3) {
        setStats({
          stage1: { sold: Number(presale.stage1.sold || 0), total: Number(presale.stage1.total || defaults.stage1) },
          stage2: { sold: Number(presale.stage2.sold || 0), total: Number(presale.stage2.total || defaults.stage2) },
          stage3: { sold: Number(presale.stage3.sold || 0), total: Number(presale.stage3.total || defaults.stage3) },
        });
        return;
      }

      const readNumber = (key, fallback) => Number(localStorage.getItem(key) || fallback);
      setStats({
        stage1: { sold: readNumber("stage1Sold", 0), total: readNumber("stage1Total", defaults.stage1) },
        stage2: { sold: readNumber("stage2Sold", 0), total: readNumber("stage2Total", defaults.stage2) },
        stage3: { sold: readNumber("stage3Sold", 0), total: readNumber("stage3Total", defaults.stage3) },
      });
    } catch {
      // Use the safe, zero-sold defaults when browser storage is unavailable.
    }
  }, []);

  return stats;
}

const STAGES = [
  { key: "stage1", title: "Stage 1", allocation: "5% tokens", price: 0.02 },
  { key: "stage2", title: "Stage 2", allocation: "10% tokens", price: 0.03 },
  { key: "stage3", title: "Stage 3", allocation: "15% tokens", price: 0.05 },
];

const TOKEN_ADDRESS = "0xa90Cc0137FDA4285Eaa6da0f7a5118A1432b2a76";
const PRESALE_ADDRESS = "0x944483c8083827A8BF09c12cFC57DB6a5b22697A";
const BSCSCAN_ADDRESS_URL = "https://bscscan.com/address/";

const ALLOCATION = [
  { icon: "/assets/community.png", alt: "Community development", title: "Community Development", percentage: "30%", body: "Supporting community growth through token presale and empowering our supporters." },
  { icon: "/assets/sustainable_icon.png", alt: "Environment program", title: "Environment Program", percentage: "25%", body: "Locked for three years to promote industry skill development, with 10% unlocking each year." },
  { icon: "/assets/team.png", alt: "Team and management", title: "Team & Management", percentage: "15%", body: "Locked for three years, with 5% unlocking each year to support long-term commitment." },
  { icon: "/assets/marketing.png", alt: "Marketing and promotion", title: "Marketing & Promotional", percentage: "10%", body: "For brand awareness and community engagement that support steady growth." },
  { icon: "/assets/liquidity.png", alt: "Liquidity and risk management", title: "Liquidity & Risk Management", percentage: "20%", body: "Provides liquidity stability for smooth operation and risk management." },
];

const fmt = (value) => Number(value || 0).toLocaleString("en-IN");
const pct = (sold, total) => Math.max(0, Math.min(100, (sold / Math.max(1, total)) * 100));

export default function Tokenomics() {
  const live = usePresaleStats();

  return (
    <main className="tokenomics-page">
      <div className="tok-container">
        <section className="tok-hero" aria-labelledby="tokenomics-title">
          <div className="tok-card tok-hero-copy">
            <p className="tok-eyebrow">EDG on BNB Chain</p>
            <h1 id="tokenomics-title">EDG Tokenomics</h1>
            <p>Supporting transparency, sustainability and community-led industrial innovation.</p>
          </div>
          <div className="tok-card tok-hero-art">
            <img className="tok-hero-gif" src="/assets/edg-process-centered_proB.gif" alt="Engineering Drawing ecosystem process visualization" width="640" height="360" decoding="async" />
          </div>
        </section>

        <section className="tok-section tok-official" aria-labelledby="official-resources-title">
          <div className="tok-section-head">
            <div>
              <p className="tok-eyebrow">Official resources</p>
              <h2 id="official-resources-title">EDG on BNB Smart Chain</h2>
            </div>
            <p className="tok-network">BNB Smart Chain · Chain ID 56</p>
          </div>
          <div className="tok-official-grid">
            <article className="tok-card tok-resource-card">
              <h3>EDG token contract</h3>
              <a href={`${BSCSCAN_ADDRESS_URL}${TOKEN_ADDRESS}`} target="_blank" rel="noreferrer">{TOKEN_ADDRESS}</a>
              <span>View the official token address on BscScan.</span>
            </article>
            <article className="tok-card tok-resource-card">
              <h3>Presale contract</h3>
              <a href={`${BSCSCAN_ADDRESS_URL}${PRESALE_ADDRESS}`} target="_blank" rel="noreferrer">{PRESALE_ADDRESS}</a>
              <span>View the official presale address on BscScan.</span>
            </article>
            <article className="tok-card tok-resource-card">
              <h3>Official support</h3>
              <a href="mailto:contact@engineeringdrawing.io">contact@engineeringdrawing.io</a>
              <span>For token, product and partnership enquiries.</span>
            </article>
          </div>
        </section>

        <section className="tok-section stages" aria-labelledby="presale-stages-title">
          <div className="tok-section-head">
            <div>
              <p className="tok-eyebrow">Pre-sale</p>
              <h2 id="presale-stages-title">EDG token stages</h2>
            </div>
            <Link to="/presale" className="tok-btn">Go to Presale</Link>
          </div>
          <div className="tok-stage-grid">
            {STAGES.map((stage) => {
              const data = live[stage.key] || { sold: 0, total: 0 };
              const progress = pct(data.sold, data.total);
              return (
                <article key={stage.key} className="tok-card stage">
                  <div className="tok-stage-top">
                    <div>
                      <h3>{stage.title}</h3>
                      <p>{stage.allocation}</p>
                    </div>
                    {stage.key === "stage1" && <span className="tok-live">Live</span>}
                  </div>
                  <p className="tok-stage-price"><strong>{stage.price.toFixed(2)} USDT</strong> per EDG</p>
                  <div className="tok-bar" role="progressbar" aria-label={`${stage.title} tokens sold`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></div>
                  <p className="tok-stage-foot">{fmt(data.sold)} of {fmt(data.total)} EDG sold</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="tok-section allocation" aria-labelledby="allocation-title">
          <div className="tok-section-head">
            <div>
              <p className="tok-eyebrow">Token allocation</p>
              <h2 id="allocation-title">How EDG is allocated</h2>
            </div>
          </div>
          <div className="tok-alloc-grid">
            {ALLOCATION.map((item) => (
              <article key={item.title} className="tok-card alloc-card">
                <div className="tok-alloc-icon"><img src={item.icon} alt={item.alt} width="32" height="32" loading="lazy" decoding="async" /></div>
                <p className="tok-percentage">{item.percentage}</p>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
