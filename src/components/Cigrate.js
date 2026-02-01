import React, { useEffect, useState } from 'react';
import Notification from './Notification';
import Report from './Report';
 import './Cigrate.css';

function Cigrate(props) {
  const [aqi, setAqi] = useState(""); 
  const [pm25, setPm25] = useState(null);
  const [cigarettes, setCigarettes] = useState(0);
  const [showReport,setShowReport] = useState( )
  const [count, setCount]= useState(1)

  const lat = props.location.lat;
  const long = props.location.lat;

  const fetchAirQuality = async () => { 
    try {
      const res = await fetch(
        `http://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${long}&appid=d20a1d1d93a48db41372a0393ad30a84`
      );


      const data = await res.json();
      // console.log(data.list[0].main)
      console.log(data.list)
      if (data?.list?.length > 0) {
        setAqi(data.list[0].main.aqi);


        const pm25Value = props.totalData.pm2_5; // Extract PM2.5
        console.log(" props.totalData " + props.totalData.pm2_5);
        setPm25(props.totalData.pm2_5);

        // Calculate cigarettes equivalent
        const cigaretteEquivalent = (props.totalData.pm2_5 / 22).toFixed(2);
        setCigarettes(cigaretteEquivalent);
      }
    } catch (error) {
      console.error("Error fetching air quality data:", error);
    }
  };


  useEffect(() => {
    fetchAirQuality();
  }, []);



  return (
    <>
    <div className="container">
  {aqi === 1 && <Notification title={"🌿 Excellent Air Quality"} 
    message={"The air is fresh and safe to breathe. Enjoy your day outdoors!"}
    className="notification aqi-good" /> }

  {aqi === 2 && <Notification title={"😷 Moderate Air Quality"}
    message={"Some pollutants are present. Sensitive individuals should be cautious."}
    className="notification aqi-moderate" /> }  

  {aqi === 3 && <Notification title={"⚠ Unhealthy for Sensitive Groups"}
    message={"People with breathing issues should limit outdoor activities."}
    className="notification aqi-unhealthy" /> }

  {aqi === 4 && <Notification title={"❌ Unhealthy Air Quality"}
    message={"Everyone may experience health effects. Reduce outdoor exposure."}
    className="notification aqi-very-unhealthy" /> }

  {aqi === 5 && <Notification title={"☠ Hazardous Air Quality"}
    message={"Extremely bad air! Stay indoors and wear a mask if going out."}
    className="notification aqi-hazardous" /> }
<div className="cigarette-info">
  {pm25 !== null ? (
    <p>
       🌫️ PM2.5 Level: <span className='cigeratte-count'>  <strong>{props.totalData.pm2_5} µg/m³</strong> </span><br />
      Equivalent to smoking  🚬 <span className='cigeratte-count'> <strong>{cigarettes} cigarettes  per day</strong></span>.
    </p>
  ) : (
    <p>⏳ Loading air quality data...</p>
  )}
</div>

  <button onClick={() => setShowReport(!showReport)}>
        {showReport ? "Hide " : "Predict AQI (PM2.5 & PM10 )for 5 days"}
      </button>

      {/* Show Report component when button is clicked */}
      {showReport && <Report lat={lat} long={long} />}
</div>
  
     

    {/* <button onClick={()=>setCount(count + 1)}>COUNT is : {count}</button> */}
    {/* <button onClick={()=>Report}>Viewwwww</button> */}



    {/* For showing Report */}
 
    </>
  );
}

export default Cigrate;