import { useMemo } from "react";
import {
  Activity,
  BatteryFull,
  Cpu,
  Droplets,
  Gauge,
  MapPin,
  ShieldCheck,
  ThermometerSun,
  Wifi,
  Wind,
} from "lucide-react";
import {
  calculateAQIFromComponents,
  getAQIMetadata,
  getAQIRecommendation,
} from "./airQualityUtils";
import "./TravelBuddy.css";

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
  {
    timestamp: "10:42",
    pm2_5: 28.1,
    pm10: 61.2,
  },
  {
    timestamp: "10:47",
    pm2_5: 31.4,
    pm10: 66.9,
  },
  {
    timestamp: "10:52",
    pm2_5: 32.8,
    pm10: 68.4,
  },
];

const TravelBuddy = () => {
  const aqi = useMemo(
    () =>
      calculateAQIFromComponents({
        pm2_5: devicePacket.sensors.pm2_5,
        pm10: devicePacket.sensors.pm10,
      }),
    []
  );
  const aqiMeta = useMemo(() => getAQIMetadata(aqi), [aqi]);
  const aqiRecommendation = useMemo(() => getAQIRecommendation(aqi), [aqi]);

  const previousAqi = useMemo(() => {
    const previous = packetHistory[1];
    return calculateAQIFromComponents({
      pm2_5: previous.pm2_5,
      pm10: previous.pm10,
    });
  }, []);

  const hasAqi = Number.isFinite(aqi);
  const hasPrevAqi = Number.isFinite(previousAqi);
  const trendValue = hasAqi && hasPrevAqi ? aqi - previousAqi : 0;
  const trendLabel = trendValue <= -3 ? "Improving" : trendValue >= 3 ? "Rising" : "Stable";

  const exposureScore = Math.max(0, Math.min(100, Math.round(100 - (aqi ?? 0) / 5)));

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
                <strong>{devicePacket.battery}%</strong>
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-icon">
                <Wifi size={18} />
              </div>
              <div>
                <span className="metric-label">Signal</span>
                <strong>{devicePacket.signal} dBm</strong>
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
              <strong>{devicePacket.deviceId}</strong>
            </div>
            <div className="device-meta">
              <span>Firmware</span>
              <strong>{devicePacket.firmware}</strong>
            </div>
            <div className="device-meta">
              <span>Last Sync</span>
              <strong>{devicePacket.lastSync}</strong>
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
            <span>{devicePacket.location.label}</span>
          </div>
        </div>
      </section>

      <section className="travel-grid">
        <div className="travel-card aqi-card">
          <div className="travel-card-header">
            <h3>Computed AQI</h3>
            <span className="pill" style={{ color: aqiMeta.color }}>
              {aqiMeta.label}
            </span>
          </div>
          <div className="aqi-value" style={{ color: aqiMeta.color }}>
            {aqi ?? "--"}
          </div>
          <p className="aqi-recommendation">{aqiRecommendation}</p>
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
                <strong>{devicePacket.sensors.pm2_5} µg/m³</strong>
              </div>
            </div>
            <div className="reading-item">
              <Wind size={18} />
              <div>
                <span>PM10</span>
                <strong>{devicePacket.sensors.pm10} µg/m³</strong>
              </div>
            </div>
            <div className="reading-item">
              <Activity size={18} />
              <div>
                <span>CO₂</span>
                <strong>{devicePacket.sensors.co2} ppm</strong>
              </div>
            </div>
            <div className="reading-item">
              <Gauge size={18} />
              <div>
                <span>VOC</span>
                <strong>{devicePacket.sensors.voc} mg/m³</strong>
              </div>
            </div>
            <div className="reading-item">
              <ThermometerSun size={18} />
              <div>
                <span>Temp</span>
                <strong>{devicePacket.sensors.temp} °C</strong>
              </div>
            </div>
            <div className="reading-item">
              <Droplets size={18} />
              <div>
                <span>Humidity</span>
                <strong>{devicePacket.sensors.humidity}%</strong>
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
  "deviceId": "${devicePacket.deviceId}",
  "timestamp": "2026-02-11T10:52:12+05:30",
  "sensors": {
    "pm2_5": ${devicePacket.sensors.pm2_5},
    "pm10": ${devicePacket.sensors.pm10},
    "co2": ${devicePacket.sensors.co2},
    "voc": ${devicePacket.sensors.voc},
    "temp": ${devicePacket.sensors.temp},
    "humidity": ${devicePacket.sensors.humidity}
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
    </div>
  );
};

export default TravelBuddy;
