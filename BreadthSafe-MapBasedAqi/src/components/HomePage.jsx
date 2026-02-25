import React from "react";
import MapView from "./MapView";
import Sidebar from "./Sidebar";
import "./HomePage.css";

export default function HomePage() {
  return (
    <div className="home-layout">
      <div className="home-main">
        <MapView />
      </div>
      <div className="home-sidebar">
        <Sidebar />
      </div>
    </div>
  );
}
