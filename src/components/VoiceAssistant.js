import React, { useState, useEffect } from "react";
import { Mic } from "lucide-react"; 
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import MapView from "./MapView"; 

const VoiceAssistant = () => {
  const [city, setCity] = useState("");
  const { transcript, listening } = useSpeechRecognition();

  // Detect City Name from Speech
  useEffect(() => {
    if (transcript) {
      console.log("User Speech Input:", transcript);

      // Extract city name (Assuming user says "AQI of <city>")
      const words = transcript.split(" ");
      const cityIndex = words.findIndex((word) => word.toLowerCase() === "aqi");
      
      if (cityIndex !== -1 && cityIndex + 1 < words.length) {
        const detectedCity = words.slice(cityIndex + 1).join(" "); // Extract full city name
        setCity(detectedCity);
        console.log("Detected City:", detectedCity);
      }
    }
  }, [transcript]);

  return (
    <div className="bg-gray-800 text-white min-h-screen">
      <button onClick={SpeechRecognition.startListening} className="voice-icon">
        <Mic className="w-5 h-5" />
        <span>{listening ? "Listening..." : ""}</span>
      </button>

      {/* Pass the detected city name to MapView */}
      {city && <MapView city={city} />} 
    </div>
  );
};

export default VoiceAssistant;
