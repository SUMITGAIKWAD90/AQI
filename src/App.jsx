// import './App.css';
// import { useState } from "react";
// import { Route, Routes } from "react-router-dom";
// import AirQualityChart from './components/AirQualityChart';
// import MapView from './components/MapView';
// import Navbar from './components/Navbar';
// import SafeRoute from './components/SafeRoute';
// import TravelBuddy from './components/TravelBuddy';
// import AIChat from './components/AIChats';
// import Solutions from './components/Solutions';


// function App() {
//   const [selectedLocation, setSelectedLocation] = useState({
//     lat: 18.5204,
//     lon: 73.8567,
//   });

//   const [aqiData, setAqiData] = useState(null); // NEW
  
//   return (
//     <div className='App'>
//       <Navbar/>
//       <div className="app-container">
//         <Routes>
//           <Route
//             path="/"
//             element={
//               <div className="dashboard-layout">
//                 {/* Main Map and Pollutants Section */}
//                 <MapView onLocationChange={setSelectedLocation} />

//                 {/* Charts Section */}
//                 <div className="dashboard-bottom">
//                   <AirQualityChart lat={selectedLocation?.lat} lon={selectedLocation?.lon} onDataFetched={setAqiData}/>
//                 </div>

//                 {/* Safe Route Section */}
//                 <SafeRoute/>
//               </div>
//             }
//           />
//           <Route path="/travel-buddy" element={<TravelBuddy />} />
          
//           <Route path="/Solutions" element={<Solutions />} />
//         </Routes>
//       </div>
//    {/* AI Chat is placed OUTSIDE routes so it appears everywhere */}
//       <AIChat 
//         aqiData={aqiData}
//         location={selectedLocation}
//       />
//     </div>
//   );
// }

// export default App;




import './App.css';
import { useEffect, useRef, useState } from "react";
import { Route, Routes } from "react-router-dom";
import AirQualityChart from './components/AirQualityChart';
import MapView from './components/MapView';
import Navbar from './components/Navbar';
import SafeRoute from './components/SafeRoute';
import TravelBuddy from './components/TravelBuddy';
import AIChat from './components/AIChats';
import axios from "axios";

function App() {
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 18.5204,
    lon: 73.8567,
      name: "",
    state: "",
    country: ""
  });

  const [aqiData, setAqiData] = useState(null); // NEW
  const [areaAnalysis, setAreaAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

    const lastAnalyzedLocationRef = useRef(null);


   const fullLocationName = [
    selectedLocation.name,
    selectedLocation.state,
    selectedLocation.country
  ]

  const handleAnalyzeArea = async () => {
    if (!aqiData?.currentAQI) return;

    setAnalysisLoading(true);

    try {
      const res = await axios.post("http://localhost:5000/area-analysis", {
         locationName: `${selectedLocation.name || ""}, ${selectedLocation.state || ""}, ${selectedLocation.country || ""}`.replace(/^,\s*|,\s*$/g, ""),
        lat: selectedLocation.lat,
        lon: selectedLocation.lon,
        aqi: aqiData.currentAQI
      });

      setAreaAnalysis(res.data.analysis);

    } catch (err) {
      console.error(err);
    }

    setAnalysisLoading(false);
  };

  //   useEffect(() => {
  //   if (
  //     selectedLocation?.lat &&
  //     selectedLocation?.lon &&
  //     aqiData?.currentAQI &&
  //     aqiData.currentAQI >= 120
  //   ) {
  //     const locationKey = `${selectedLocation.lat}-${selectedLocation.lon}`;

  //     if (lastAnalyzedLocationRef.current !== locationKey) {
  //       lastAnalyzedLocationRef.current = locationKey;
  //       setAreaAnalysis(null); // clear old analysis
  //       handleAnalyzeArea();
  //     }
  //   }
  // }, [selectedLocation, aqiData]);

  useEffect(() => {
  if (!selectedLocation?.lat || !selectedLocation?.lon) return;
  if (!aqiData?.currentAQI) return;

  // If AQI is below threshold, clear analysis
  if (aqiData.currentAQI < 120) {
    setAreaAnalysis(null);
    lastAnalyzedLocationRef.current = null;
    return;
  }

  const locationKey = `${selectedLocation.lat}-${selectedLocation.lon}-${aqiData.currentAQI}`;

  if (lastAnalyzedLocationRef.current === locationKey) return;

  lastAnalyzedLocationRef.current = locationKey;

  setAreaAnalysis(null);
  handleAnalyzeArea();

}, [aqiData]);

  return (
    <div className='App'>
      <Navbar />
      <div className="app-container">
        <Routes>
          <Route
            path="/"
            element={
              <div className="dashboard-layout">
                {/* Main Map and Pollutants Section */}
                {/* <MapView onLocationChange={setSelectedLocation} /> */}
                <MapView
                  onLocationChange={setSelectedLocation}
                  areaAnalysis={areaAnalysis}
                  handleAnalyzeArea={handleAnalyzeArea}
                  analysisLoading={analysisLoading}
                  aqiData={aqiData}
                />
                {/* Charts Section */}
                <div className="dashboard-bottom">
                  <AirQualityChart lat={selectedLocation?.lat} lon={selectedLocation?.lon} onDataFetched={setAqiData} />
                </div>

                {/* Safe Route Section */}
                <SafeRoute />
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
