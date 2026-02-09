import './App.css';
import { useState } from "react";
import AirQualityChart from './components/AirQualityChart';
import MapView from './components/MapView';
import Navbar from './components/Navbar';
import SafeRoute from './components/SafeRoute';

function App() {
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 18.5204,
    lon: 73.8567,
  });

  return (
    <div className='App'>
      <Navbar/>
      <div className="app-container">
        <div className="dashboard-layout">
          {/* Main Map and Pollutants Section */}
          <MapView onLocationChange={setSelectedLocation} />
          
          {/* Charts Section */}
          <div className="dashboard-bottom">
            <AirQualityChart lat={selectedLocation?.lat} lon={selectedLocation?.lon} />
          </div>
          
          {/* Safe Route Section */}
          <SafeRoute/>
        </div>
      </div>
    </div>
  );
}

export default App;
