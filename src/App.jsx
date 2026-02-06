import './App.css';
import AirQualityChart from './components/AirQualityChart';
import MapView from './components/MapView';
import Navbar from './components/Navbar';
import SafeRoute from './components/SafeRoute';

function App() {
  return (
    <div className='App'>
      <Navbar/>
      <div className="app-container">
        <div className="dashboard-layout">
          {/* Main Map and Pollutants Section */}
          <MapView/>
          
          {/* Charts Section */}
          <div className="dashboard-bottom">
            <AirQualityChart/>
          </div>
          
          {/* Safe Route Section */}
          <SafeRoute/>
        </div>
      </div>
    </div>
  );
}

export default App;
