import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from "chart.js";
import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import "./AirQualityChart.css";
import Card from "./Card";
import Loader from "./Loader";
import { fetchAQIHistoryByCoords, fetchCurrentAQIByCoords } from "./openWeatherApi";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const DEFAULT_COORDS = { lat: 18.5204, lon: 73.8567 };
const DEFAULT_LOOKBACK_DAYS = 45;
const AQI_SOURCE_LABEL = "OpenWeather Current + History";

const AQI_BAND_LEGEND = [
  { label: "Good", range: "0-50", color: "rgba(34, 197, 94, 0.7)" },
  { label: "Moderate", range: "51-100", color: "rgba(250, 204, 21, 0.74)" },
  { label: "Unhealthy", range: "101-150", color: "rgba(249, 115, 22, 0.78)" },
  { label: "Very Unhealthy", range: "151+", color: "rgba(239, 68, 68, 0.82)" },
];

const pad2 = (value) => String(value).padStart(2, "0");

const toLocalDayKey = (date) => (
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
);

const unixToLocalDayKey = (unix) => {
  const value = Number(unix);
  if (!Number.isFinite(value) || value <= 0) return "";
  return toLocalDayKey(new Date(value * 1000));
};

const formatLabelDate = (dateValue) => {
  const parsed = new Date(`${dateValue}T00:00:00`);
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getAqiLevelLabel = (aqi) => {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy";
  return "Very Unhealthy";
};

const getAQIBarColor = (aqi) => {
  if (!Number.isFinite(aqi)) return "rgba(100, 116, 139, 0.65)";
  if (aqi <= 25) return "rgba(22, 163, 74, 0.65)";
  if (aqi <= 50) return "rgba(34, 197, 94, 0.68)";
  if (aqi <= 75) return "rgba(234, 179, 8, 0.7)";
  if (aqi <= 100) return "rgba(250, 204, 21, 0.74)";
  if (aqi <= 125) return "rgba(251, 146, 60, 0.74)";
  if (aqi <= 150) return "rgba(249, 115, 22, 0.78)";
  if (aqi <= 200) return "rgba(248, 113, 113, 0.8)";
  return "rgba(239, 68, 68, 0.82)";
};

const getAQIBarBorderColor = (aqi) => {
  if (!Number.isFinite(aqi)) return "rgba(100, 116, 139, 1)";
  if (aqi <= 50) return "rgba(22, 163, 74, 1)";
  if (aqi <= 100) return "rgba(234, 179, 8, 1)";
  if (aqi <= 150) return "rgba(249, 115, 22, 1)";
  return "rgba(239, 68, 68, 1)";
};

const average = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const getTrendInfo = (dayRows) => {
  if (!dayRows.length) return { label: "Stable", delta: 0 };
  const size = Math.max(2, Math.floor(dayRows.length / 3));
  const startAvg = average(dayRows.slice(0, size).map((row) => row.aqi));
  const endAvg = average(dayRows.slice(-size).map((row) => row.aqi));
  const delta = Number((endAvg - startAvg).toFixed(1));

  if (Math.abs(delta) < 5) return { label: "Stable", delta };
  if (delta > 0) return { label: "Worsening", delta };
  return { label: "Improving", delta };
};

const toDailyAqi = (rows) => {
  const grouped = new Map();

  rows.forEach((entry) => {
    const dayKey = unixToLocalDayKey(entry?.dt);
    const aqiValue = Number(entry?.calculatedAQI);
    if (!dayKey || !Number.isFinite(aqiValue)) return;

    if (!grouped.has(dayKey)) grouped.set(dayKey, { sum: 0, count: 0 });
    const bucket = grouped.get(dayKey);
    bucket.sum += aqiValue;
    bucket.count += 1;
  });

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, bucket]) => ({
      date,
      aqi: Number((bucket.sum / bucket.count).toFixed(1)),
    }));
};

const AirQualityChart = ({ lat, lon }) => {
  const displayLat = Number.isFinite(Number(lat)) ? Number(lat) : DEFAULT_COORDS.lat;
  const displayLon = Number.isFinite(Number(lon)) ? Number(lon) : DEFAULT_COORDS.lon;

  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState({
    startDate: "",
    endDate: "",
    dayRows: [],
    source: AQI_SOURCE_LABEL,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchAqiHistory = async () => {
      setLoading(true);
      setError(null);

      try {
        const nowUnix = Math.floor(Date.now() / 1000);
        const startUnix = nowUnix - ((DEFAULT_LOOKBACK_DAYS - 1) * 24 * 60 * 60);
        const [historyRows, currentRow] = await Promise.all([
          fetchAQIHistoryByCoords(displayLat, displayLon, startUnix, nowUnix),
          fetchCurrentAQIByCoords(displayLat, displayLon),
        ]);

        const dayRows = toDailyAqi(historyRows);
        const currentAqi = Number(currentRow?.calculatedAQI);
        const todayKey = toLocalDayKey(new Date());

        if (Number.isFinite(currentAqi)) {
          const todayIndex = dayRows.findIndex((row) => row.date === todayKey);
          if (todayIndex >= 0) {
            dayRows[todayIndex] = { ...dayRows[todayIndex], aqi: Number(currentAqi.toFixed(1)) };
          } else {
            dayRows.push({ date: todayKey, aqi: Number(currentAqi.toFixed(1)) });
          }
        }

        dayRows.sort((left, right) => left.date.localeCompare(right.date));

        if (!dayRows.length) {
          throw new Error("No AQI history returned for this location/date range.");
        }

        const labels = dayRows.map((row) => formatLabelDate(row.date));
        const values = dayRows.map((row) => row.aqi);
        const barColors = values.map(getAQIBarColor);
        const barBorders = values.map(getAQIBarBorderColor);

        if (!isMounted) return;

        setChartData({
          labels,
          datasets: [
            {
              label: "Daily AQI",
              data: values,
              backgroundColor: barColors,
              borderColor: barBorders,
              borderWidth: 1.2,
              borderRadius: 6,
              borderSkipped: false,
              barPercentage: 0.34,
              categoryPercentage: 0.62,
              maxBarThickness: 8,
              minBarLength: 2,
              hoverBackgroundColor: values.map((value) => getAQIBarBorderColor(value)),
              hoverBorderColor: "#f8fafc",
              hoverBorderWidth: 1.8,
            },
          ],
        });

        setMeta({
          startDate: dayRows[0]?.date || "",
          endDate: dayRows[dayRows.length - 1]?.date || "",
          dayRows,
          source: AQI_SOURCE_LABEL,
        });
        setLoading(false);
      } catch (fetchError) {
        if (!isMounted) return;
        console.error("AQI chart fetch error:", fetchError);
        setError(fetchError?.message || "Failed to load AQI history.");
        setLoading(false);
      }
    };

    fetchAqiHistory();

    return () => {
      isMounted = false;
    };
  }, [displayLat, displayLon]);

  const summary = useMemo(() => {
    const values = meta.dayRows.map((row) => row.aqi).filter(Number.isFinite);
    if (!values.length) return null;

    const trend = getTrendInfo(meta.dayRows);
    const avg = average(values);
    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      avg: Number(avg.toFixed(1)),
      min: Number(min.toFixed(1)),
      max: Number(max.toFixed(1)),
      level: getAqiLevelLabel(avg),
      trendLabel: trend.label,
      trendDelta: trend.delta,
      points: values.length,
    };
  }, [meta.dayRows]);

  const suggestedMax = useMemo(() => {
    const maxAqi = summary?.max ?? 160;
    return Math.max(160, Math.ceil((maxAqi + 15) / 25) * 25);
  }, [summary]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 700,
      easing: "easeOutQuart",
    },
    transitions: {
      active: {
        animation: {
          duration: 220,
        },
      },
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.96)",
        titleColor: "#F8FAFC",
        bodyColor: "#E2E8F0",
        borderColor: "rgba(148, 163, 184, 0.25)",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title(items) {
            const index = items?.[0]?.dataIndex ?? 0;
            return meta.dayRows[index]?.date || "Date";
          },
          label(context) {
            const value = Number(context.parsed.y);
            return `AQI ${value.toFixed(1)}`;
          },
          afterLabel(context) {
            const value = Number(context.parsed.y);
            return `Category: ${getAqiLevelLabel(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },
        ticks: {
          color: "#94A3B8",
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12,
          padding: 6,
          font: {
            size: 11,
          },
        },
      },
      y: {
        beginAtZero: true,
        suggestedMax,
        grid: {
          color: "rgba(148, 163, 184, 0.14)",
          drawBorder: false,
        },
        ticks: {
          color: "#94A3B8",
          font: {
            size: 11,
          },
        },
        title: {
          display: true,
          text: "AQI",
          color: "#CBD5E1",
          font: {
            size: 12,
            weight: "500",
          },
        },
      },
    },
  };

  const trendClassName = summary?.trendLabel === "Improving"
    ? "summary-value is-good"
    : summary?.trendLabel === "Worsening"
      ? "summary-value is-bad"
      : "summary-value";

  return (
    <Card
      title="Historical AQI Trends"
      subtitle={`${meta.startDate || "N/A"} to ${meta.endDate || "N/A"} | ${displayLat.toFixed(3)}, ${displayLon.toFixed(3)}`}
      icon="Chart"
    >
      <div className="aqi-chart-layout">
        <div className="chart-meta-row">
          <span className="meta-pill">{DEFAULT_LOOKBACK_DAYS}-day window</span>
          <span className="meta-pill">{summary?.points ?? 0} daily points</span>
          <span className="meta-pill">{meta.source}</span>
        </div>

        {summary && (
          <div className="chart-summary">
            <div className="summary-item">
              <span className="summary-label">Average</span>
              <span className="summary-value">{summary.avg}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Best</span>
              <span className="summary-value">{summary.min}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Peak</span>
              <span className="summary-value">{summary.max}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Level</span>
              <span className="summary-value">{summary.level}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Trend</span>
              <span className={trendClassName}>
                {summary.trendLabel}
                {summary.trendLabel !== "Stable" ? ` (${summary.trendDelta > 0 ? "+" : ""}${summary.trendDelta})` : ""}
              </span>
            </div>
          </div>
        )}

        <div className="aqi-legend-row">
          {AQI_BAND_LEGEND.map((band) => (
            <div className="legend-chip" key={band.label}>
              <span className="legend-dot" style={{ backgroundColor: band.color }}></span>
              <span>{band.label}</span>
              <span className="legend-range">{band.range}</span>
            </div>
          ))}
        </div>

        <div className="chart-wrapper">
          {loading ? (
            <Loader size="lg" text="Loading AQI history..." />
          ) : error ? (
            <div className="chart-error">
              <span className="error-icon">!</span>
              <p className="error-message">{error}</p>
            </div>
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      </div>
    </Card>
  );
};

export default AirQualityChart;
