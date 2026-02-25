import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import "./AQICharacter.css";

const getState = (aqiValue) => {
  const value = Number(aqiValue);
  if (!Number.isFinite(value)) return "healthy";
  if (value <= 50) return "healthy";
  if (value <= 100) return "moderate";
  if (value <= 200) return "unhealthy";
  return "severe";
};

const STATE_COPY = {
  healthy: "Breathing fresh air",
  moderate: "Slight cough detected",
  unhealthy: "Mask recommended",
  severe: "High stress exposure",
};

const CharacterIllustration = ({ state }) => {
  if (state === "moderate") {
    return (
      <svg viewBox="0 0 140 200" role="img" aria-label="AQI character coughing">
        <defs>
          <linearGradient id="aqi-suit-moderate" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="46" r="30" fill="#f8d4b0" />
        <circle cx="58" cy="44" r="4" fill="#0f172a" />
        <circle cx="82" cy="44" r="4" fill="#0f172a" />
        <path d="M62 60 Q70 66 78 60" stroke="#0f172a" strokeWidth="3" fill="none" />
        <path d="M94 58 Q104 62 108 72" stroke="#f97316" strokeWidth="3" fill="none" />
        <path d="M102 72 Q112 76 116 88" stroke="#f97316" strokeWidth="3" fill="none" />
        <rect x="44" y="74" width="52" height="74" rx="18" fill="url(#aqi-suit-moderate)" />
        <rect x="40" y="96" width="60" height="14" rx="7" fill="#0f172a" opacity="0.2" />
        <rect x="28" y="148" width="28" height="12" rx="6" fill="#0f172a" />
        <rect x="84" y="148" width="28" height="12" rx="6" fill="#0f172a" />
        <rect x="26" y="90" width="24" height="12" rx="6" fill="#f8d4b0" />
      </svg>
    );
  }

  if (state === "unhealthy") {
    return (
      <svg viewBox="0 0 140 200" role="img" aria-label="AQI character wearing mask">
        <defs>
          <linearGradient id="aqi-suit-unhealthy" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="46" r="30" fill="#f4c6a4" />
        <rect x="48" y="52" width="44" height="18" rx="8" fill="#e2e8f0" />
        <circle cx="58" cy="44" r="4" fill="#0f172a" />
        <circle cx="82" cy="44" r="4" fill="#0f172a" />
        <path d="M60 34 Q70 28 80 34" stroke="#0f172a" strokeWidth="3" fill="none" />
        <rect x="42" y="74" width="56" height="74" rx="18" fill="url(#aqi-suit-unhealthy)" />
        <rect x="38" y="98" width="64" height="14" rx="7" fill="#0f172a" opacity="0.2" />
        <rect x="28" y="148" width="28" height="12" rx="6" fill="#0f172a" />
        <rect x="84" y="148" width="28" height="12" rx="6" fill="#0f172a" />
      </svg>
    );
  }

  if (state === "severe") {
    return (
      <svg viewBox="0 0 140 200" role="img" aria-label="AQI character stressed">
        <defs>
          <linearGradient id="aqi-suit-severe" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7f1d1d" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="46" r="30" fill="#f2c0a0" />
        <rect x="46" y="52" width="48" height="20" rx="8" fill="#e2e8f0" />
        <path d="M54 42 L62 46" stroke="#0f172a" strokeWidth="3" />
        <path d="M86 42 L78 46" stroke="#0f172a" strokeWidth="3" />
        <path d="M56 64 Q70 72 84 64" stroke="#0f172a" strokeWidth="3" fill="none" />
        <rect x="42" y="74" width="56" height="74" rx="18" fill="url(#aqi-suit-severe)" />
        <rect x="36" y="98" width="68" height="14" rx="7" fill="#0f172a" opacity="0.2" />
        <rect x="28" y="148" width="28" height="12" rx="6" fill="#0f172a" />
        <rect x="84" y="148" width="28" height="12" rx="6" fill="#0f172a" />
        <circle cx="102" cy="24" r="6" fill="#38bdf8" opacity="0.75" />
        <circle cx="112" cy="34" r="4" fill="#38bdf8" opacity="0.6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 140 200" role="img" aria-label="AQI character healthy">
      <defs>
        <linearGradient id="aqi-suit-healthy" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <circle cx="70" cy="46" r="30" fill="#f8d4b0" />
      <circle cx="58" cy="44" r="4" fill="#0f172a" />
      <circle cx="82" cy="44" r="4" fill="#0f172a" />
      <path d="M58 58 Q70 68 82 58" stroke="#0f172a" strokeWidth="3" fill="none" />
      <rect x="42" y="74" width="56" height="74" rx="18" fill="url(#aqi-suit-healthy)" />
      <rect x="38" y="98" width="64" height="14" rx="7" fill="#0f172a" opacity="0.15" />
      <rect x="28" y="148" width="28" height="12" rx="6" fill="#0f172a" />
      <rect x="84" y="148" width="28" height="12" rx="6" fill="#0f172a" />
      <path d="M100 44 Q114 40 118 30" stroke="#38bdf8" strokeWidth="3" fill="none" />
      <path d="M104 56 Q118 54 124 44" stroke="#38bdf8" strokeWidth="3" fill="none" />
    </svg>
  );
};

export default function AQICharacter({ aqiValue }) {
  const state = getState(aqiValue);

  return (
    <div className={clsx("aqi-character", `aqi-character--${state}`)}>
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          className="aqi-character-figure"
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: -6 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <CharacterIllustration state={state} />
        </motion.div>
      </AnimatePresence>
      <div className="aqi-character-label">
        <span className="aqi-character-state">{state.replace("_", " ")}</span>
        <span className="aqi-character-note">{STATE_COPY[state]}</span>
      </div>
    </div>
  );
}
