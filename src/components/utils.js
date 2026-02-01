export const fetchCityCoordinates = async (city) => {
    try {
      const apiKey = "d20a1d1d93a48db41372a0393ad30a84"; // Replace with your API key
      const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`);
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
  