import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BatteryFull,
  Clock,
  Cpu,
  Download,
  Droplets,
  Gauge,
  MapPin,
  Save,
  Share2,
  ShieldAlert,
  ShieldCheck,
  ThermometerSun,
  Wifi,
  Wind,
} from "lucide-react";
import { calculateAQIFromComponents, getAQIMetadata, getAQIRecommendation } from "./airQualityUtils";
import "./TravelBuddy.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTooltip,
  Legend,
  Filler
);

const apiBase =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  "";

const devicePacket = {
  deviceId: "TB-AX12",
  firmware: "1.8.3",
  battery: 82,
  signal: -55,
  lastSync: "12 sec ago",
  location: {
    label: "Pune, IN · Transit Hub",
    lat: 18.5204,
    lon: 73.8567,
  },
  sensors: {
    pm2_5: 32.8,
    pm10: 68.4,
    co2: 612,
    voc: 0.42,
    temp: 29.1,
    humidity: 48,
    pressure: 1006,
  },
};

const packetHistory = [
  { timestamp: "10:42", pm2_5: 28.1, pm10: 61.2 },
  { timestamp: "10:47", pm2_5: 31.4, pm10: 66.9 },
  { timestamp: "10:52", pm2_5: 32.8, pm10: 68.4 },
];

const AQI_ORDER = ["good", "moderate", "poor", "unhealthy", "severe", "hazardous"];

const AQI_BANDS = {
  good: {
    label: "Good",
    max: 50,
    color: "#22c55e",
    bg: "rgba(34,197,94,0.14)",
  },
  moderate: {
    label: "Moderate",
    max: 100,
    color: "#eab308",
    bg: "rgba(234,179,8,0.16)",
  },
  poor: {
    label: "Poor",
    max: 150,
    color: "#f97316",
    bg: "rgba(249,115,22,0.18)",
  },
  unhealthy: {
    label: "Unhealthy",
    max: 200,
    color: "#ef4444",
    bg: "rgba(239,68,68,0.2)",
  },
  severe: {
    label: "Severe",
    max: 300,
    color: "#a855f7",
    bg: "rgba(168,85,247,0.18)",
  },
  hazardous: {
    label: "Hazardous",
    max: Infinity,
    color: "#7f1d1d",
    bg: "rgba(127,29,29,0.2)",
  },
};

const getAqiBand = (aqi) => {
  if (!Number.isFinite(aqi)) return null;
  for (const key of AQI_ORDER) {
    if (aqi <= AQI_BANDS[key].max) return key;
  }
  return "hazardous";
};

const getAqiMeta = (aqi) => {
  const key = getAqiBand(aqi) || "good";
  return AQI_BANDS[key];
};

const TOAST_CONFIG = {
  unhealthy: {
    duration: 7000,
    icon: "⚠️",
    accent: "#f97316",
    bg: "rgba(249,115,22,0.10)",
    border: "rgba(249,115,22,0.35)",
    title: "Air Quality Warning",
    lines: (aqi) => [
      `AQI is now ${aqi} — unhealthy for sensitive groups.`,
      "Limit prolonged outdoor exposure.",
    ],
  },
  severe: {
    duration: 9000,
    icon: "🚨",
    accent: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.35)",
    title: "Severe Air Pollution Alert",
    lines: (aqi) => [
      `AQI is now ${aqi} — health risk for all groups.`,
      "Wear N95 mask · Avoid outdoor activity.",
    ],
  },
  hazardous: {
    duration: 12000,
    icon: "🚨",
    accent: "#9333ea",
    bg: "rgba(147,51,234,0.10)",
    border: "rgba(147,51,234,0.40)",
    title: "Emergency Pollution Level",
    lines: (aqi) => [
      `AQI is now ${aqi} — serious health effects possible.`,
      "Stay indoors · Use air purifier if available.",
    ],
  },
};

const weeklyReport = {
  weekStart: "2026-02-15",
  weekEnd: "2026-02-21",
  traveler: "Ava R.",
  analytics: {
    averageAqi: 86,
    highestAqi: 142,
    lowestAqi: 48,
    weekOverWeekDelta: -8,
    weekOverWeekLabel: "Cleaner week",
    trend: [
      { day: "Mon", aqi: 94 },
      { day: "Tue", aqi: 112 },
      { day: "Wed", aqi: 88 },
      { day: "Thu", aqi: 78 },
      { day: "Fri", aqi: 96 },
      { day: "Sat", aqi: 82 },
      { day: "Sun", aqi: 71 },
    ],
    exposureHours: {
      good: 12,
      moderate: 18,
      poor: 7,
      unhealthy: 4,
      severe: 1,
      hazardous: 0,
    },
  },
  health: {
    riskLevel: "Moderate",
    alertCount: 6,
    unhealthyExposureHours: 12.3,
    alertHistory: [
      { band: "good", count: 9 },
      { band: "moderate", count: 6 },
      { band: "poor", count: 4 },
      { band: "unhealthy", count: 2 },
      { band: "severe", count: 1 },
    ],
  },
};

const RISK_CONFIG = {
  Low: { color: "#22c55e", score: 28 },
  Moderate: { color: "#f59e0b", score: 56 },
  High: { color: "#ef4444", score: 82 },
};

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const formatDateRange = (start, end) => {
  const endYear = new Date(end).getFullYear();
  return `${formatDate(start)} - ${formatDate(end)}, ${endYear}`;
};

const TravelBuddy = () => {
  const [livePm25, setLivePm25] = useState(devicePacket.sensors.pm2_5);
  const [liveAqi, setLiveAqi] = useState(null);
  const [liveSensorLine, setLiveSensorLine] = useState("");

  const [toasts, setToasts] = useState([]);
  const previousBandRef = useRef(null);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const triggerHealthWarning = useCallback(
    (band, aqi) => {
      const cfg = TOAST_CONFIG[band];
      if (!cfg) return;
      const id = `${band}-${Date.now()}`;
      setToasts((prev) => [...prev, { id, band, aqi, cfg }]);
      setTimeout(() => dismissToast(id), cfg.duration);
    },
    [dismissToast]
  );

  // Stream live PM2.5 from backend SSE (falls back to dummy)
  useEffect(() => {
    const streamUrl = `${apiBase}/api/stream`;
    const es = new EventSource(streamUrl);
    let isActive = true;

    const parseSensorLine = (line) => {
      if (typeof line !== "string") return { pm25: null, aqi: null };
      const pmMatch = line.match(/PM2\.5:\s*([-+]?\d*\.?\d+)/i);
      const aqiMatch = line.match(/AQI:\s*(\d+)/i);
      return {
        pm25: pmMatch ? Number(pmMatch[1]) : null,
        aqi: aqiMatch ? Number(aqiMatch[1]) : null,
      };
    };

    const applyReading = (data) => {
      const pm25Number =
        typeof data.pm25 === "number"
          ? data.pm25
          : typeof data.pm25 === "string"
          ? Number(data.pm25)
          : null;
      const aqiNumber =
        typeof data.aqi === "number"
          ? data.aqi
          : typeof data.aqi === "string"
          ? Number(data.aqi)
          : null;

      if (Number.isFinite(pm25Number)) setLivePm25(Number(pm25Number.toFixed(1)));
      if (Number.isFinite(aqiNumber)) setLiveAqi(Math.round(aqiNumber));

      if (typeof data.sensorData === "string" && data.sensorData.trim()) {
        const line = data.sensorData.trim();
        setLiveSensorLine(line);
        const parsed = parseSensorLine(line);
        if (Number.isFinite(parsed.pm25)) setLivePm25(Number(parsed.pm25.toFixed(1)));
        if (Number.isFinite(parsed.aqi)) setLiveAqi(Math.round(parsed.aqi));
      }
    };

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        applyReading(data);
      } catch (err) {
        console.error("Failed to parse stream payload", err);
      }
    };

    es.onerror = () => {};

    const pollTimer = setInterval(async () => {
      try {
        const response = await fetch(`${apiBase}/api/sensor-data`);
        if (!response.ok) return;
        const data = await response.json();
        if (isActive) applyReading(data);
      } catch {
        // Ignore transient polling errors.
      }
    }, 2000);

    return () => {
      isActive = false;
      clearInterval(pollTimer);
      es.close();
    };
  }, []);

  useEffect(() => {
    const currentBand = getAqiBand(liveAqi);
    if (
      currentBand &&
      previousBandRef.current !== null &&
      previousBandRef.current !== currentBand &&
      (currentBand === "unhealthy" || currentBand === "severe" || currentBand === "hazardous")
    ) {
      triggerHealthWarning(currentBand, liveAqi);
    }
    if (currentBand) previousBandRef.current = currentBand;
  }, [liveAqi, triggerHealthWarning]);

  const livePacket = useMemo(
    () => ({
      ...devicePacket,
      sensors: { ...devicePacket.sensors, pm2_5: livePm25 },
    }),
    [livePm25]
  );

  const computedAqi = useMemo(
    () =>
      calculateAQIFromComponents({
        pm2_5: livePacket.sensors.pm2_5,
        pm10: livePacket.sensors.pm10,
      }),
    [livePacket]
  );

  const aqi = Number.isFinite(liveAqi) ? liveAqi : null;
  const aqiMeta = useMemo(() => getAQIMetadata(aqi), [aqi]);
  const aqiRecommendation = useMemo(() => getAQIRecommendation(aqi), [aqi]);

  const previousAqi = useMemo(() => {
    if (Number.isFinite(liveAqi)) return liveAqi;
    const previous = packetHistory[1];
    return calculateAQIFromComponents({ pm2_5: previous.pm2_5, pm10: previous.pm10 });
  }, [liveAqi]);

  const hasAqi = Number.isFinite(aqi);
  const hasPrevAqi = Number.isFinite(previousAqi);
  const trendValue = hasAqi && hasPrevAqi ? aqi - previousAqi : 0;
  const trendLabel = trendValue <= -3 ? "Improving" : trendValue >= 3 ? "Rising" : "Stable";

  const exposureScore = Math.max(0, Math.min(100, Math.round(100 - ((aqi ?? computedAqi ?? 0) / 5))));

  const weekRange = formatDateRange(weeklyReport.weekStart, weeklyReport.weekEnd);
  const avgMeta = getAqiMeta(weeklyReport.analytics.averageAqi);
  const riskConfig = RISK_CONFIG[weeklyReport.health.riskLevel];

  const trendLabels = weeklyReport.analytics.trend.map((item) => item.day);
  const trendValues = weeklyReport.analytics.trend.map((item) => item.aqi);
  const exposureLabels = AQI_ORDER.map((key) => AQI_BANDS[key].label);
  const exposureValues = AQI_ORDER.map((key) => weeklyReport.analytics.exposureHours[key]);
  const exposureColors = AQI_ORDER.map((key) => AQI_BANDS[key].color);

  const lineData = {
    labels: trendLabels,
    datasets: [
      {
        label: "Weekly AQI",
        data: trendValues,
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.18)",
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: "#38bdf8",
        pointBorderColor: "rgba(15, 23, 42, 0.9)",
        pointHoverRadius: 6,
      },
    ],
  };

  const barData = {
    labels: exposureLabels,
    datasets: [
      {
        label: "Exposure Hours",
        data: exposureValues,
        backgroundColor: exposureColors,
        borderRadius: 10,
        maxBarThickness: 32,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: "#64748b" } },
      y: {
        grid: { color: "rgba(148,163,184,0.25)" },
        ticks: { color: "#64748b" },
      },
    },
  };

  return (
    <div className="travel-buddy-page">
      <section className="travel-hero">
        <div className="travel-hero-content">
          <span className="travel-pill">
            <Cpu size={14} />
            Travel Buddy Hardware
          </span>
          <h2>Travel Buddy</h2>
          <p>
            Clip-on device that locks onto your luggage or keychain and streams live AQI packets
            through Wi-Fi. The backend sends JSON payloads, and we translate them into a clean,
            actionable air quality snapshot while you move.
          </p>

          <div className="travel-hero-metrics">
            <div className="metric-card">
              <div className="metric-icon">
                <BatteryFull size={18} />
              </div>
              <div>
                <span className="metric-label">Battery</span>
                <strong>{livePacket.battery}%</strong>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">
                <Wifi size={18} />
              </div>
              <div>
                <span className="metric-label">Signal</span>
                <strong>{livePacket.signal} dBm</strong>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <span className="metric-label">Health</span>
                <strong>Optimal</strong>
              </div>
            </div>
          </div>

          <div className="travel-hero-footer">
            <div className="device-meta">
              <span>Device ID</span>
              <strong>{livePacket.deviceId}</strong>
            </div>
            <div className="device-meta">
              <span>Firmware</span>
              <strong>{livePacket.firmware}</strong>
            </div>
            <div className="device-meta">
              <span>Last Sync</span>
              <strong>{livePacket.lastSync}</strong>
            </div>
          </div>
        </div>

        <div className="travel-hero-device">
          <div className="device-illustration">
            <svg viewBox="0 0 260 180" role="img" aria-label="Travel Buddy sensor module">
              <defs>
                <linearGradient id="tb-shell" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#1f2937" />
                </linearGradient>
                <linearGradient id="tb-board" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0f766e" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
              <rect x="24" y="20" width="212" height="140" rx="24" fill="url(#tb-shell)" />
              <rect x="44" y="40" width="172" height="100" rx="18" fill="url(#tb-board)" />
              <circle cx="88" cy="70" r="16" fill="#0f172a" opacity="0.75" />
              <circle cx="128" cy="70" r="16" fill="#0f172a" opacity="0.75" />
              <circle cx="168" cy="70" r="16" fill="#0f172a" opacity="0.75" />
              <rect x="70" y="102" width="120" height="16" rx="8" fill="#0f172a" opacity="0.55" />
              <rect x="60" y="120" width="140" height="10" rx="5" fill="#0b5f58" opacity="0.65" />
            </svg>
            <div className="device-lights">
              <span className="device-light green" />
              <span className="device-light amber" />
              <span className="device-light blue" />
            </div>
            <div className="device-tag">TB-AX12</div>
          </div>
          <div className="device-location">
            <MapPin size={16} />
            <span>{livePacket.location.label}</span>
          </div>
        </div>
      </section>

      <section className="travel-grid">
        <div className="travel-card aqi-card">
          <div className="travel-card-header">
            <h3>Live AQI</h3>
            <span className="pill" style={{ color: aqiMeta.color }}>
              {aqiMeta.label}
            </span>
          </div>
          <div className="aqi-value" style={{ color: aqiMeta.color }}>
            {aqi ?? "--"}
          </div>
          <p className="aqi-recommendation">{aqiRecommendation}</p>
          {liveSensorLine ? <p className="aqi-recommendation">{liveSensorLine}</p> : null}
          <div className="aqi-footer">
            <div>
              <span className="small-label">Trend</span>
              <strong>{trendLabel}</strong>
            </div>
            <div>
              <span className="small-label">Exposure Score</span>
              <strong>{exposureScore}%</strong>
            </div>
            <div>
              <span className="small-label">Packet Rate</span>
              <strong>15s</strong>
            </div>
          </div>
        </div>

        <div className="travel-card">
          <div className="travel-card-header">
            <h3>Live Sensor Readings</h3>
            <span className="chip">JSON → Metrics</span>
          </div>
          <div className="reading-grid">
            <div className="reading-item">
              <Wind size={18} />
              <div>
                <span>PM2.5</span>
                <strong>{livePacket.sensors.pm2_5} µg/m³</strong>
              </div>
            </div>
            <div className="reading-item">
              <Wind size={18} />
              <div>
                <span>PM10</span>
                <strong>{livePacket.sensors.pm10} µg/m³</strong>
              </div>
            </div>
            <div className="reading-item">
              <Activity size={18} />
              <div>
                <span>CO₂</span>
                <strong>{livePacket.sensors.co2} ppm</strong>
              </div>
            </div>
            <div className="reading-item">
              <Gauge size={18} />
              <div>
                <span>VOC</span>
                <strong>{livePacket.sensors.voc} mg/m³</strong>
              </div>
            </div>
            <div className="reading-item">
              <ThermometerSun size={18} />
              <div>
                <span>Temp</span>
                <strong>{livePacket.sensors.temp} °C</strong>
              </div>
            </div>
            <div className="reading-item">
              <Droplets size={18} />
              <div>
                <span>Humidity</span>
                <strong>{livePacket.sensors.humidity}%</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="travel-card sensor-card">
          <div className="travel-card-header">
            <h3>Sensor Array</h3>
            <span className="chip">Hardware Images</span>
          </div>
          <div className="sensor-grid">
            <div className="sensor-item">
              <svg viewBox="0 0 120 90" role="img" aria-label="Laser particle sensor">
                <rect x="6" y="10" width="108" height="70" rx="16" fill="#0f172a" />
                <rect x="18" y="22" width="84" height="46" rx="12" fill="#14b8a6" />
                <circle cx="40" cy="45" r="8" fill="#0f172a" />
                <circle cx="80" cy="45" r="8" fill="#0f172a" />
              </svg>
              <div>
                <span>Laser PM</span>
                <strong>PM2.5 + PM10</strong>
              </div>
            </div>
            <div className="sensor-item">
              <svg viewBox="0 0 120 90" role="img" aria-label="Electrochemical CO2 sensor">
                <rect x="10" y="12" width="100" height="66" rx="14" fill="#1f2937" />
                <rect x="24" y="26" width="72" height="38" rx="10" fill="#f97316" />
                <rect x="40" y="36" width="40" height="18" rx="6" fill="#0f172a" />
              </svg>
              <div>
                <span>CO₂ Cell</span>
                <strong>High precision</strong>
              </div>
            </div>
            <div className="sensor-item">
              <svg viewBox="0 0 120 90" role="img" aria-label="VOC microarray sensor">
                <rect x="8" y="16" width="104" height="60" rx="16" fill="#0f766e" />
                <rect x="22" y="28" width="76" height="36" rx="10" fill="#0f172a" />
                <rect x="32" y="36" width="16" height="20" rx="4" fill="#14b8a6" />
                <rect x="56" y="36" width="16" height="20" rx="4" fill="#14b8a6" />
                <rect x="80" y="36" width="16" height="20" rx="4" fill="#14b8a6" />
              </svg>
              <div>
                <span>VOC Array</span>
                <strong>0.2 µm channel</strong>
              </div>
            </div>
            <div className="sensor-item">
              <svg viewBox="0 0 120 90" role="img" aria-label="Environmental combo sensor">
                <rect x="14" y="10" width="92" height="70" rx="18" fill="#1e293b" />
                <circle cx="60" cy="44" r="22" fill="#14b8a6" />
                <circle cx="60" cy="44" r="10" fill="#0f172a" />
              </svg>
              <div>
                <span>Env Combo</span>
                <strong>Temp + RH</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="travel-card packet-card">
          <div className="travel-card-header">
            <h3>Latest Packet</h3>
            <span className="chip">Wi-Fi JSON</span>
          </div>
          <pre className="packet-json">
{`{
  "deviceId": "${livePacket.deviceId}",
  "timestamp": "2026-02-11T10:52:12+05:30",
  "sensors": {
    "pm2_5": ${livePacket.sensors.pm2_5},
    "aqi": ${Number.isFinite(liveAqi) ? liveAqi : "null"},
    "pm10": ${livePacket.sensors.pm10},
    "co2": ${livePacket.sensors.co2},
    "voc": ${livePacket.sensors.voc},
    "temp": ${livePacket.sensors.temp},
    "humidity": ${livePacket.sensors.humidity}
  }
}`}
          </pre>
          <div className="history">
            {packetHistory.map((packet) => (
              <div className="history-row" key={packet.timestamp}>
                <span>{packet.timestamp}</span>
                <span>PM2.5 {packet.pm2_5}</span>
                <span>PM10 {packet.pm10}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="weekly-report">
        <div className="travel-card weekly-hero">
          <div className="weekly-hero-content">
            <span className="weekly-pill">Weekly Report</span>
            <h3>Personalized AQI Travel Summary</h3>
            <p>
              Insightful analytics for the week with exposure patterns and health risk tracking.
            </p>
            <div className="weekly-meta">
              <div className="meta-item">
                <MapPin size={14} />
                <span>{weeklyReport.traveler}</span>
              </div>
              <div className="meta-item">
                <Clock size={14} />
                <span>{weekRange}</span>
              </div>
            </div>
            <div className="weekly-kpis">
              <div>
                <span>Avg AQI</span>
                <strong style={{ color: avgMeta.color }}>{weeklyReport.analytics.averageAqi}</strong>
              </div>
              <div>
                <span>Highest</span>
                <strong>{weeklyReport.analytics.highestAqi}</strong>
              </div>
              <div>
                <span>Lowest</span>
                <strong>{weeklyReport.analytics.lowestAqi}</strong>
              </div>
              <div>
                <span>Risk Level</span>
                <strong style={{ color: riskConfig.color }}>{weeklyReport.health.riskLevel}</strong>
              </div>
            </div>
          </div>
          <div className="weekly-actions">
            <button className="action-btn primary">
              <Download size={16} />
              Download PDF
            </button>
            <button className="action-btn">
              <Share2 size={16} />
              Share
            </button>
            <button className="action-btn">
              <Save size={16} />
              Save
            </button>
          </div>
        </div>

        <div className="weekly-grid">
          <div className="travel-card analytics-card">
            <div className="travel-card-header">
              <h3>AQI Exposure Analytics</h3>
              <div className="delta-chip">
                {weeklyReport.analytics.weekOverWeekDelta <= 0 ? (
                  <ArrowDownRight size={16} />
                ) : (
                  <ArrowUpRight size={16} />
                )}
                <span>
                  {Math.abs(weeklyReport.analytics.weekOverWeekDelta)} AQI {weeklyReport.analytics.weekOverWeekLabel}
                </span>
              </div>
            </div>
            <div className="analytics-metrics">
              <div>
                <span>Average AQI</span>
                <strong style={{ color: avgMeta.color }}>{weeklyReport.analytics.averageAqi}</strong>
              </div>
              <div>
                <span>Highest AQI</span>
                <strong>{weeklyReport.analytics.highestAqi}</strong>
              </div>
              <div>
                <span>Lowest AQI</span>
                <strong>{weeklyReport.analytics.lowestAqi}</strong>
              </div>
            </div>
            <div className="aqi-legend">
              {AQI_ORDER.map((key) => (
                <span
                  key={key}
                  className="legend-chip"
                  style={{ "--aqi-color": AQI_BANDS[key].color, "--aqi-bg": AQI_BANDS[key].bg }}
                >
                  {AQI_BANDS[key].label}
                </span>
              ))}
            </div>
          </div>
          <div className="travel-card chart-card">
            <h3>Weekly AQI Trend</h3>
            <div className="chart-wrapper">
              <Line data={lineData} options={chartOptions} />
            </div>
          </div>
          <div className="travel-card chart-card">
            <h3>Exposure Hours by AQI Level</h3>
            <div className="chart-wrapper">
              <Bar data={barData} options={chartOptions} />
            </div>
          </div>
        </div>

        <div className="weekly-grid">
          <div className="travel-card health-card">
            <div className="travel-card-header">
              <h3>Health Risk Analysis</h3>
            </div>
            <div className="risk-ring" style={{ "--risk": riskConfig.score, "--risk-color": riskConfig.color }}>
              <div className="risk-inner">
                <span>Risk Level</span>
                <strong style={{ color: riskConfig.color }}>{weeklyReport.health.riskLevel}</strong>
              </div>
            </div>
            <div className="health-metrics">
              <div>
                <ShieldAlert size={18} />
                <div>
                  <span>Alert Count</span>
                  <strong>{weeklyReport.health.alertCount}</strong>
                </div>
              </div>
              <div>
                <Activity size={18} />
                <div>
                  <span>Unhealthy Exposure</span>
                  <strong>{weeklyReport.health.unhealthyExposureHours} hrs</strong>
                </div>
              </div>
              <div>
                <ShieldCheck size={18} />
                <div>
                  <span>Safe Streak</span>
                  <strong>3 consecutive days</strong>
                </div>
              </div>
            </div>
          </div>
          <div className="travel-card health-card">
            <div className="travel-card-header">
              <h3>Alert History Summary</h3>
            </div>
            <div className="alert-history">
              {weeklyReport.health.alertHistory.map((item) => (
                <div key={item.band} className="alert-row">
                  <span>{AQI_BANDS[item.band].label}</span>
                  <div className="alert-bar">
                    <span style={{ width: `${item.count * 12}%` }} />
                  </div>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
            <div className="health-footnote">
              Exposure duration in unhealthy zones peaked on Feb 19, 2026 between 5-7 PM.
            </div>
          </div>
        </div>
      </section>

      {toasts.length > 0 && (
        <div className="tb-toast-portal" aria-live="assertive" aria-atomic="false">
          {toasts.map(({ id, aqi, cfg }) => (
            <AqiToast
              key={id}
              id={id}
              aqi={aqi}
              cfg={cfg}
              onDismiss={dismissToast}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TravelBuddy;

function AqiToast({ id, aqi, cfg, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const enterTimer = setTimeout(() => setVisible(true), 16);

    startRef.current = performance.now();
    const tick = (now) => {
      const elapsed = now - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / cfg.duration) * 100);
      setProgress(pct);
      if (pct > 0) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      clearTimeout(enterTimer);
      cancelAnimationFrame(rafRef.current);
    };
  }, [cfg.duration]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(id), 300);
  };

  return (
    <div
      className={`tb-toast ${visible ? "tb-toast--in" : "tb-toast--out"}`}
      style={{
        "--toast-accent": cfg.accent,
        "--toast-bg": cfg.bg,
        "--toast-border": cfg.border,
      }}
      role="alert"
    >
      <div className="tb-toast-inner">
        <span className="tb-toast-icon">{cfg.icon}</span>
        <div className="tb-toast-body">
          <p className="tb-toast-title">{cfg.title}</p>
          {cfg.lines(aqi).map((line, i) => (
            <p key={i} className="tb-toast-line">
              {line}
            </p>
          ))}
        </div>
        <button className="tb-toast-close" onClick={handleDismiss} aria-label="Dismiss">
          ✕
        </button>
      </div>
      <div className="tb-toast-progress" style={{ width: `${progress}%` }} />
    </div>
  );
}
