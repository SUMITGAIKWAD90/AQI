import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "./AirQualityChart.css";

ChartJS.register(BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend);

const AirQualityChart = ({ lat, lon }) => {
  const [aqiData, setAqiData] = useState({ labels: [], datasets: [] });

  useEffect(() => {
    // if (!lat || !lon) {
    //   console.error("Latitude and Longitude are required");
    //   return;
    // }

    fetch(
      `https://api.weatherbit.io/v2.0/history/airquality?lat=51&lon=73&start_date=2025-02-22&end_date=2025-02-23&tz=local&key=dea316599d084ffb8f8a647712092282`
    )
      .then((response) => response.json())
      .then((data) => {
        if (!data || !data.data) {
          console.error("Invalid API response:", data);
          return;
        }

        const times = data.data.map((entry) => entry.datetime);
        const aqiValues = data.data.map((entry) => entry.aqi);

        setAqiData({
          labels: times,
          datasets: [
            {
              label: "Air Quality Index (AQI)",
              data: aqiValues,
              backgroundColor: "rgba(255, 99, 132, 0.2)",
              borderColor: "rgba(255, 99, 132, 1)",
              borderWidth: 1,
            },
          ],
        });
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, [lat, lon]); // ✅ Depend on `lat` and `lon`

  return (
    <div className="chart-container">
      <h1> Air Quality Index - Report</h1>
      <div className="chart-wrapper">
        <Bar
          data={aqiData}
          options={{
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: "AQI",
                },
              },
            },
            plugins: {
              legend: {
                display: true,
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default AirQualityChart;
