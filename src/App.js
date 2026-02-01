import './App.css';
import AirQualityChart from './components/AirQualityChart';
import HomePage from './components/HomePage';
import MapView from './components/MapView';
import Navbar from './components/Navbar';
import SafeRoute from './components/SafeRoute';
// import MapView from './components/MapView';

function App() {
  return (
    <div className='App'>
      <Navbar/>
      {/* <HomePage/> */}
      <MapView/>
      <SafeRoute/>
    </div>
  );
}

export default App;
