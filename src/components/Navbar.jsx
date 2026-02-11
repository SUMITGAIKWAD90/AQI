import { Flame, LayoutGrid, Wind } from "lucide-react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  return (
    <motion.nav
      className="navbar"
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="brand-icon" aria-hidden="true">
            <Wind size={26} />
          </div>
          <div className="brand-text">
            <h1 className="brand-title">AQI Monitor</h1>
            <p className="brand-subtitle">Environmental Data Dashboard</p>
          </div>
        </div>

        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link active">
              <LayoutGrid size={18} className="nav-icon" />
              Dashboard
            </Link>
          </li>
          <li className="nav-item">
            <Link to="https://wildfire-monitoring-2.onrender.com/" className="nav-link">
              <Flame size={18} className="nav-icon" />
              Wildfire Monitor
            </Link>
          </li>
        </ul>
      </div>
    </motion.nav>
  );
};

export default Navbar;
