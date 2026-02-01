import React from 'react'
import MapView from './MapView'
import Sidebar from './Sidebar'

export default function HomePage() {
  return (
    <div style={{ display: "flex", height: "100vh", padding: "20px", gap: "20px" }}>
    <div style={{ flex: 1, margin: "10px", padding: "20px", background: "#f0f0f0", borderRadius: "10px" }}>
      <MapView />
    </div>
    <div style={{ width: "300px", margin: "10px", padding: "20px", background: "#e0e0e0", borderRadius: "10px" }}>
      <Sidebar />
    </div>
  </div>
  
  )
}
