import React from 'react';
import ReactDOM from 'react-dom/client'; // Correct import for React 18
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import 'leaflet/dist/leaflet.css';
import { BrowserRouter } from "react-router-dom"; // Remove duplicate import

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Measure performance
reportWebVitals();
