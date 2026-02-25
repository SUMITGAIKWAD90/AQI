import { useEffect, useMemo, useState } from "react";
import "./AqiAnalysisDashboard.css";

const normalizeList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
};

const buildAnalysisText = (areaAnalysis) => {
  if (!areaAnalysis) return "";

  const lines = [
    "AI analysis initialized.",
    "Scanning AQI signals, emissions sources, and policy context...",
    "Synthesizing local insights...",
    "",
  ];

  const sections = [
    {
      title: "Main Causes",
      key: "main_causes",
      empty: "No dominant source signal yet.",
    },
    {
      title: "Government Solutions",
      key: "government_solutions",
      empty: "No actionable policy updates detected.",
    },
    {
      title: "Citizen Actions",
      key: "citizen_actions",
      empty: "No immediate citizen guidance available yet.",
    },
  ];

  sections.forEach((section) => {
    const items = normalizeList(areaAnalysis[section.key]);
    lines.push(`${section.title}:`);
    if (!items.length) {
      lines.push(`- ${section.empty}`);
    } else {
      items.forEach((item) => {
        lines.push(`- ${item}`);
      });
    }
    lines.push("");
  });

  return lines.join("\n").trim();
};

const buildSummary = (areaAnalysis) => {
  const mainCauses = normalizeList(areaAnalysis?.main_causes);
  const governmentSolutions = normalizeList(areaAnalysis?.government_solutions);
  const citizenActions = normalizeList(areaAnalysis?.citizen_actions);
  const sections = [
    { label: "Main Causes", count: mainCauses.length },
    { label: "Gov. Solutions", count: governmentSolutions.length },
    { label: "Citizen Actions", count: citizenActions.length },
  ];
  const total = sections.reduce((sum, section) => sum + section.count, 0);
  return { sections, total };
};

export function AqiAnalysisDashboard({ areaAnalysis }) {
  const analysisText = useMemo(() => buildAnalysisText(areaAnalysis), [areaAnalysis]);
  const summary = useMemo(() => buildSummary(areaAnalysis), [areaAnalysis]);

  const [typedText, setTypedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!analysisText) {
      setTypedText("");
      setIsTyping(false);
      return;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setTypedText(analysisText);
      setIsTyping(false);
      return;
    }

    let isActive = true;
    let index = 0;
    let timer = null;

    setTypedText("");
    setIsTyping(true);

    const typeNext = () => {
      if (!isActive) return;
      index += 1;
      setTypedText(analysisText.slice(0, index));
      if (index < analysisText.length) {
        timer = setTimeout(typeNext, 18);
      } else {
        setIsTyping(false);
      }
    };

    timer = setTimeout(typeNext, 320);

    return () => {
      isActive = false;
      if (timer) clearTimeout(timer);
    };
  }, [analysisText]);

  if (!areaAnalysis) return null;

  return (
    <div className="aqia-root">
      <div className="aqia-header">
        <div className="aqia-header-left">
          <span className="aqia-eyebrow">AI Intelligence Report</span>
          <h3 className="aqia-title">Area Analysis</h3>
          <p className="aqia-subtitle">
            Live synthesis from sensors, weather context, and policy signals.
          </p>
        </div>
        <div className="aqia-status">
          <span className={`aqia-status-dot ${isTyping ? "is-typing" : ""}`} />
          <span className="aqia-status-label">
            {isTyping ? "Synthesizing" : "Analysis Ready"}
          </span>
        </div>
      </div>

      <div className="aqia-terminal">
        <div className="aqia-terminal-bar">
          <div className="aqia-terminal-controls">
            <span className="control red" />
            <span className="control amber" />
            <span className="control green" />
          </div>
          <div className="aqia-terminal-title">AQI Insight Engine</div>
          <div className="aqia-terminal-chip">
            {isTyping ? "Generating" : "Complete"}
          </div>
        </div>

        <div className="aqia-terminal-body">
          <pre className="aqia-typed" aria-live="polite" aria-atomic="false">
            {typedText}
            <span
              className={`aqia-caret ${isTyping ? "is-active" : ""}`}
              aria-hidden="true"
            />
          </pre>
        </div>

        <div className="aqia-meta">
          <span>Signals processed: {summary.total}</span>
          <div className="aqia-meta-tags">
            {summary.sections.map((section) => (
              <span key={section.label} className="aqia-tag">
                {section.label}: {section.count}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
