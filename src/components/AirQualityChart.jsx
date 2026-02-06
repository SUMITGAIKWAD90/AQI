import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Title,
    Tooltip,
} from "chart.js";
import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import "./AirQualityChart.css";
import Card from "./Card";
import Loader from "./Loader";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const AirQualityChart = ({ lat, lon }) => {
  const [aqiData, setAqiData] = useState({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(
      `https://api.weatherbit.io/v2.0/history/airquality?lat=51&lon=73&start_date=2025-02-22&end_date=2025-02-23&tz=local&key=dea316599d084ffb8f8a647712092282`
    )
      .then((response) => response.json())
      .then((data) => {
        if (!data || !data.data) {
          console.error("Invalid API response:", data);
          setError("Failed to load historical data");
          setLoading(false);
          return;
        }

        const times = data.data.map((entry) => {
          const date = new Date(entry.datetime);
          return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        });
        const aqiValues = data.data.map((entry) => entry.aqi);

        setAqiData({
          labels: times,
          datasets: [
            {
              label: "Air Quality Index (AQI)",
              data: aqiValues,
              backgroundColor: "rgba(14, 165, 233, 0.6)",
              borderColor: "rgba(14, 165, 233, 1)",
              borderWidth: 2,
              borderRadius: 6,
            },
          ],
        });
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setError("Failed to load chart data");
        setLoading(false);
      });
  }, [lat, lon]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#F8FAFC',
          font: {
            size: 12,
            weight: '500'
          },
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        titleColor: '#F8FAFC',
        bodyColor: '#CBD5E1',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            return `AQI: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: '#94A3B8',
          font: {
            size: 11
          }
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false
        },
        ticks: {
          color: '#94A3B8',
          font: {
            size: 11
          }
        },
        title: {
          display: true,
          text: 'AQI Value',
          color: '#CBD5E1',
          font: {
            size: 12,
            weight: '500'
          }
        }
      }
    }
  };

  return (
    <Card 
      title="Historical AQI Trends" 
      subtitle="24-hour air quality analysis"
      icon="📊"
    >
      <div className="chart-wrapper">
        {loading ? (
          <Loader size="lg" text="Loading chart data..." />
        ) : error ? (
          <div className="chart-error">
            <span className="error-icon">⚠️</span>
            <p className="error-message">{error}</p>
          </div>
        ) : (
          <Bar data={aqiData} options={chartOptions} />
        )}
      </div>
    </Card>
  );
};

export default AirQualityChart;
