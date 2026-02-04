import { Link } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-icon">🌍</div>
          <div className="brand-text">
            <h1 className="brand-title">AQI Monitor</h1>
            <p className="brand-subtitle">Environmental Data Dashboard</p>
          </div>
        </div>
        
        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link active">
              <span className="nav-icon">🏠</span>
              Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <Link to="https://wildfire-monitoring.onrender.com" className="nav-link">
              <span className="nav-icon">🔥</span>
              Wildfire Monitor
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
