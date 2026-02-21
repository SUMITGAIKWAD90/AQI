// Drop-in replacement for the areaAnalysis block.
// Import and add to your TravelBuddy.css:  @import "./AqiAnalysisDashboard.css";

const CATEGORIES = [
  {
    key: "main_causes",
    label: "Main Causes",
    abbr: "01",
    accent: "#ff6b35",
    glow: "rgba(255,107,53,0.18)",
    track: "rgba(255,107,53,0.08)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/>
        <path d="M12 8v4l3 3"/>
      </svg>
    ),
    tagline: "Root Sources",
  },
  {
    key: "government_solutions",
    label: "Government Solutions",
    abbr: "02",
    accent: "#00d4aa",
    glow: "rgba(0,212,170,0.15)",
    track: "rgba(0,212,170,0.07)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        <line x1="12" y1="15" x2="12" y2="17"/>
      </svg>
    ),
    tagline: "Policy & Regulation",
  },
  {
    key: "citizen_actions",
    label: "Citizen Actions",
    abbr: "03",
    accent: "#7c9ff5",
    glow: "rgba(124,159,245,0.15)",
    track: "rgba(124,159,245,0.07)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    tagline: "Individual Impact",
  },
];

export function AqiAnalysisDashboard({ areaAnalysis }) {
  if (!areaAnalysis) return null;

  return (
    <div className="aqia-root">
      <div className="aqia-header">
        <div className="aqia-header-left">
          <span className="aqia-eyebrow">AI Intelligence Report</span>
          <h3 className="aqia-title">Area Analysis</h3>
        </div>
        <div className="aqia-pulse-wrap">
          <span className="aqia-pulse-dot" />
          <span className="aqia-pulse-label">Live Insight</span>
        </div>
      </div>

      <div className="aqia-grid">
        {CATEGORIES.map((cat, ci) => {
          const items = areaAnalysis[cat.key] ?? [];
          return (
            <div
              key={cat.key}
              className="aqia-card"
              style={{
                "--accent": cat.accent,
                "--glow": cat.glow,
                "--track": cat.track,
                "--delay": `${ci * 90}ms`,
              }}
            >
              {/* Card top bar */}
              <div className="aqia-card-bar" />

              {/* Card header */}
              <div className="aqia-card-head">
                <div className="aqia-card-icon" style={{ color: cat.accent }}>
                  {cat.icon}
                </div>
                <div>
                  <p className="aqia-card-abbr">{cat.abbr}</p>
                  <h4 className="aqia-card-label">{cat.label}</h4>
                  <p className="aqia-card-tagline">{cat.tagline}</p>
                </div>
                <span className="aqia-count">{items.length}</span>
              </div>

              {/* Divider */}
              <div className="aqia-divider" />

              {/* Items */}
              <ul className="aqia-items">
                {items.map((item, ii) => (
                  <li
                    key={ii}
                    className="aqia-item"
                    style={{ "--item-delay": `${ci * 90 + ii * 55}ms` }}
                  >
                    <span className="aqia-item-num">{String(ii + 1).padStart(2, "0")}</span>
                    <span className="aqia-item-dot" />
                    <span className="aqia-item-text">{item}</span>
                  </li>
                ))}
              </ul>

              {/* Bottom glow strip */}
              <div className="aqia-card-glow-strip" />
            </div>
          );
        })}
      </div>
    </div>
  );
}