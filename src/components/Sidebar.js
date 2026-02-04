import Badge from "./Badge";
import "./Sidebar.css";

const Sidebar = ({ totalData }) => {
  const getPollutantInfo = (key) => {
    const pollutants = {
      co: { name: 'Carbon Monoxide', unit: 'μg/m³', icon: '⚠️' },
      no: { name: 'Nitrogen Monoxide', unit: 'μg/m³', icon: '🔵' },
      no2: { name: 'Nitrogen Dioxide', unit: 'μg/m³', icon: '🟠' },
      o3: { name: 'Ozone', unit: 'μg/m³', icon: '☁️' },
      so2: { name: 'Sulfur Dioxide', unit: 'μg/m³', icon: '💨' },
      pm2_5: { name: 'PM2.5', unit: 'μg/m³', icon: '🔴' },
      pm10: { name: 'PM10', unit: 'μg/m³', icon: '🟤' },
      nh3: { name: 'Ammonia', unit: 'μg/m³', icon: '💚' }
    };
    return pollutants[key] || { name: key.toUpperCase(), unit: 'μg/m³', icon: '📊' };
  };

  const getPollutantLevel = (key, value) => {
    if (key === 'pm2_5') {
      if (value <= 12) return { label: 'Good', variant: 'good' };
      if (value <= 35.4) return { label: 'Moderate', variant: 'moderate' };
      if (value <= 55.4) return { label: 'Unhealthy', variant: 'unhealthy' };
      if (value <= 150.4) return { label: 'Very Unhealthy', variant: 'very-unhealthy' };
      return { label: 'Hazardous', variant: 'hazardous' };
    }
    if (key === 'pm10') {
      if (value <= 54) return { label: 'Good', variant: 'good' };
      if (value <= 154) return { label: 'Moderate', variant: 'moderate' };
      if (value <= 254) return { label: 'Unhealthy', variant: 'unhealthy' };
      return { label: 'Very Unhealthy', variant: 'very-unhealthy' };
    }
    return { label: 'Monitored', variant: 'default' };
  };

  return (
    <div className="pollutant-sidebar">
      <div className="sidebar-header">
        <h3 className="sidebar-title">Air Quality Components</h3>
        <p className="sidebar-subtitle">Real-time pollutant concentrations</p>
      </div>
      
      <div className="pollutant-list">
        {totalData ? (
          Object.entries(totalData).map(([key, value], index) => {
            const info = getPollutantInfo(key);
            const level = getPollutantLevel(key, value);
            
            return (
              <div key={index} className="pollutant-item">
                <div className="pollutant-header">
                  <span className="pollutant-icon">{info.icon}</span>
                  <div className="pollutant-info">
                    <h4 className="pollutant-name">{info.name}</h4>
                    <p className="pollutant-key">{key.toUpperCase()}</p>
                  </div>
                </div>
                <div className="pollutant-value">
                  <span className="value-number">{value.toFixed(2)}</span>
                  <span className="value-unit">{info.unit}</span>
                </div>
                <Badge variant={level.variant} size="sm">
                  {level.label}
                </Badge>
              </div>
            );
          })
        ) : (
          <div className="no-data">
            <p className="no-data-text">No air quality data available</p>
            <p className="no-data-hint">Location data is being fetched...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
