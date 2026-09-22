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
const PINKLOCK_ADDRESS = "0x407993575c91ce7643a4d4cCACc9A98c36eE1BBE";
const PINKLOCK_RECORD_URL = "https://www.pinksale.finance/pinklock/bsc/record/2052108";
const FOUNDERS = [
  { name: "Rehan ud-Din", role: "Founder", href: "https://www.linkedin.com/in/rehan-ud-din" },
  { name: "Alisha Mahmood", role: "Co-founder", href: "https://www.linkedin.com/in/alisha-mahmood-8b01bb20b" },
];

const ALLOCATION = [
  { icon: "/assets/community.png", alt: "Community development", title: "Community Development", percentage: "30%", body: "Supporting community growth through token presale and empowering our supporters." },
  { icon: "/assets/sustainable_icon.png", alt: "Environment program", title: "Environment Program", percentage: "25%", body: "24,999,999.75 EDG locked in three fixed-date releases: 2027, 2028 and 2029." },
  { icon: "/assets/team.png", alt: "Team and management", title: "Team & Management", percentage: "15%", body: "14,999,999.85 EDG locked in three fixed-date releases: 2027, 2028 and 2029." },
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
            <article className="tok-card tok-resource-card">
              <h3>On-chain lock records</h3>
              <a href={PINKLOCK_RECORD_URL} target="_blank" rel="noopener noreferrer">View a confirmed EDG lock record</a>
              <span>40% of supply is locked in six fixed-date PinkLock records.</span>
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

        <section className="tok-section tok-locks" aria-labelledby="lock-schedule-title">
          <div className="tok-section-head">
            <div>
              <p className="tok-eyebrow">On-chain commitment</p>
              <h2 id="lock-schedule-title">40% locked with fixed release dates</h2>
            </div>
            <a className="tok-btn tok-btn-secondary" href={`${BSCSCAN_ADDRESS_URL}${PINKLOCK_ADDRESS}`} target="_blank" rel="noopener noreferrer">Verify PinkLock</a>
          </div>
          <div className="tok-card tok-lock-summary">
            <p><strong>39,999,999.60 EDG</strong> is locked across six records. These are discrete unlocks at 00:00 UTC, not a daily or continuous vesting schedule.</p>
            <div className="tok-lock-grid" role="list" aria-label="EDG lock schedule">
              <div role="listitem"><strong>Environment</strong><span>9,999,999.90 EDG - 21 Aug 2027</span></div>
              <div role="listitem"><strong>Environment</strong><span>9,999,999.90 EDG - 21 Aug 2028</span></div>
              <div role="listitem"><strong>Environment</strong><span>4,999,999.95 EDG - 21 Aug 2029</span></div>
              <div role="listitem"><strong>Team</strong><span>4,999,999.95 EDG - 21 Aug 2027</span></div>
              <div role="listitem"><strong>Team</strong><span>4,999,999.95 EDG - 21 Aug 2028</span></div>
              <div role="listitem"><strong>Team</strong><span>4,999,999.95 EDG - 21 Aug 2029</span></div>
            </div>
          </div>
        </section>

        <section className="tok-section tok-founders" aria-labelledby="founders-title">
          <div className="tok-section-head">
            <div>
              <p className="tok-eyebrow">Leadership</p>
              <h2 id="founders-title">Meet the founders</h2>
            </div>
            <a className="tok-company-link" href="https://www.linkedin.com/company/engineeringdrawing/" target="_blank" rel="noopener noreferrer">Engineering Drawing on LinkedIn</a>
          </div>
          <div className="tok-founder-grid">
            {FOUNDERS.map((founder) => (
              <article key={founder.name} className="tok-card tok-founder-card">
                <span className="tok-founder-mark" aria-hidden="true">in</span>
                <div>
                  <p>{founder.role}</p>
                  <h3>{founder.name}</h3>
                  <a href={founder.href} target="_blank" rel="noopener noreferrer">Visit LinkedIn profile <span aria-hidden="true">↗</span></a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
