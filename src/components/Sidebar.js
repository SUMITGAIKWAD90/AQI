import React from "react";
import "./Sidebar.css";

const Sidebar = ({ totalData }) => {
  return (
    <div className="aqi-container">
      <div className="aqi-header">AQI Components:</div>
      <div>
        {totalData ? (
          Object.entries(totalData).map(([key, value], index) => (
            <div key={index} className="aqi-box">
              <strong>{key.toUpperCase()}:</strong> {value} μg/m³
            </div>
          ))
        ) : (
          <p>No air quality data available</p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
