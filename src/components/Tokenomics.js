import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Tokenomics.css";

/**
 * Try to read live presale numbers if your Presale page writes them.
 * Fallbacks to zeros so UI never breaks.
 * If you already expose a different shape, just adapt the mapping.
 */
function usePresaleStats() {
  const [stats, setStats] = useState({
    stage1: { sold: 0, total: 4_999_995 },
    stage2: { sold: 0, total: 9_999_999 },
    stage3: { sold: 0, total: 14_999_985 },
  });

  useEffect(() => {
    try {
      // 1) global window object (if Presale page sets it)
      const g = window.__EDG_PRESALE__;
      if (g?.stage1 && g?.stage2 && g?.stage3) {
        setStats({
          stage1: { sold: Number(g.stage1.sold || 0), total: Number(g.stage1.total || stats.stage1.total) },
          stage2: { sold: Number(g.stage2.sold || 0), total: Number(g.stage2.total || stats.stage2.total) },
          stage3: { sold: Number(g.stage3.sold || 0), total: Number(g.stage3.total || stats.stage3.total) },
        });
        return;
      }

      // 2) localStorage keys (if you save there from Presale)
      const ls = (k, d) => Number(localStorage.getItem(k) || d || 0);
      const s1 = { sold: ls("stage1Sold", 0), total: ls("stage1Total", stats.stage1.total) };
      const s2 = { sold: ls("stage2Sold", 0), total: ls("stage2Total", stats.stage2.total) };
      const s3 = { sold: ls("stage3Sold", 0), total: ls("stage3Total", stats.stage3.total) };
      setStats({ stage1: s1, stage2: s2, stage3: s3 });
    } catch {
      // keep defaults
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return stats;
}

const STAGES = [
  { key: "stage1", title: "Stage 1: 5% Tokens", price: 0.02 },
  { key: "stage2", title: "Stage 2: 10% Tokens", price: 0.03 },
  { key: "stage3", title: "Stage 3: 15% Tokens", price: 0.05 },
];

const ALLOCATION = [
  {
    icon: "/assets/community.png",
    title: "Community Development — 30%",
    body:
      "Supporting community growth through token presale, empowering our supporters.",
  },
  {
    icon: "/assets/sustainable_icon.png",
    title: "Environment Program — 25%",
    body:
      "Locked for 3 years to promote industry skill development; unlocks 10% each year.",
  },
  {
    icon: "/assets/team.png",
    title: "Team & Management — 15%",
    body:
      "Locked for 3 years, with 5% unlocking each year to ensure long-term commitment.",
  },
  {
    icon: "/assets/marketing.png",
    title: "Marketing & Promotional — 10%",
    body:
      "For brand awareness and community engagement to drive steady growth.",
  },
  {
    icon: "/assets/liquidity.png",
    title: "Liquidity & Risk Management — 20%",
    body:
      "Provides liquidity stability, ensuring smooth operation and risk management.",
  },
];

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const pct = (s, t) => Math.max(0, Math.min(100, (s / Math.max(1, t)) * 100));

export default function Tokenomics() {
  const live = usePresaleStats();

  return (
    <div className="tokenomics-page">
      <div className="tok-container">

        {/* ===== HERO (tight, no extra gap) ===== */}
        <section className="tok-hero tok-section">
          <div className="tok-card tok-hero-copy">
            <h1>EDG Tokenomics</h1>
            <p>Empowering transparency, sustainability, and community on BNB Chain.</p>
          </div>

          <div className="tok-card tok-hero-art">
            {/* Use your final GIF path here */}
            <img
              className="tok-hero-gif"
              src="/assets/edg-process-centered_proB.gif"
              alt="EDG process animation"
              loading="lazy"
            />
          </div>
        </section>

        {/* ===== PRESALE STAGES ===== */}
        <section className="tok-section stages">
          <div className="tok-side">
            <div className="tok-head">
              <span className="tok-eyebrow">PRE-SALE</span>
              <h2>Stages</h2>
            </div>
            <Link to="/presale" className="tok-btn tok-cta">Go to Presale</Link>
          </div>

          <div className="tok-stage-grid">
            {STAGES.map((st) => {
              const data = live[st.key] || { sold: 0, total: 0 };
              const p = pct(data.sold, data.total);
              return (
                <div key={st.key} className="tok-card stage">
                  <div className="tok-stage-top">
                    <div className="tok-stage-title">{st.title}</div>
                    <div className="tok-stage-price">
                      Price: <b>{st.price.toFixed(2)}</b> <span>USDT</span>
                    </div>
                  </div>

                  <div className="tok-bar" aria-label="progress">
                    <span style={{ width: `${p}%` }} />
                  </div>

                  <div className="tok-stage-foot">
                    <span>{fmt(data.sold)} / {fmt(data.total)} EDG sold</span>
                    {st.key === "stage1" && <span className="tok-live">LIVE</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== ALLOCATION ===== */}
        <section className="tok-section alloc">
          <div className="tok-side">
            <div className="tok-head">
              <span className="tok-eyebrow">TOKEN</span>
              <h2>Allocation Breakdown</h2>
            </div>
          </div>

          <div className="tok-alloc-grid">
            {ALLOCATION.map((a, i) => (
              <article key={i} className="tok-card alloc">
                <div className="tok-alloc-icon">
                  <img src={a.icon} alt="" />
                </div>
                <h3>{a.title}</h3>
                <p>{a.body}</p>
              </article>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}


