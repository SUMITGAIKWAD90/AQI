import { OPENWEATHER_API_KEY } from "./openWeatherApi";

export const fetchCityCoordinates = async (city) => {
    try {
      const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${OPENWEATHER_API_KEY}`);
      const data = await res.json();
  
      if (data.length > 0) {
        return { lat: data[0].lat, lon: data[0].lon };
      }
      return { lat: null, lon: null };
    } catch (error) {
      console.error("Error fetching coordinates:", error);
      return { lat: null, lon: null };
    }
  };
  
