import './App.css';
import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import AirQualityChart from './components/AirQualityChart';
import MapView from './components/MapView';
import Navbar from './components/Navbar';
import SafeRoute from './components/SafeRoute';
import TravelBuddy from './components/TravelBuddy';
import AIChat from './components/AIChats';

function App() {
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 18.5204,
    lon: 73.8567,
  });

  const [aqiData, setAqiData] = useState(null); // NEW
  
  return (
    <div className='App'>
      <Navbar/>
      <div className="app-container">
        <Routes>
          <Route
            path="/"
            element={
              <div className="dashboard-layout">
                {/* Main Map and Pollutants Section */}
                <MapView onLocationChange={setSelectedLocation} />

                {/* Charts Section */}
                <div className="dashboard-bottom">
                  <AirQualityChart lat={selectedLocation?.lat} lon={selectedLocation?.lon} onDataFetched={setAqiData}/>
                </div>

                {/* Safe Route Section */}
                <SafeRoute/>
              </div>
            }
          />
          <Route path="/travel-buddy" element={<TravelBuddy />} />
        </Routes>
      </div>
   {/* AI Chat is placed OUTSIDE routes so it appears everywhere */}
      <AIChat 
        aqiData={aqiData}
        location={selectedLocation}
      />
    </div>
  );
}

export default App;
