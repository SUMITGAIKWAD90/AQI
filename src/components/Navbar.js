import React, { useState } from "react";
import { Link } from "react-router-dom"; // If using React Router
import { FaBars, FaTimes } from "react-icons/fa";
import "./Navbar.css"; // Import CSS file

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="navbar">
      <div style={{  color: "white" }} className="logo">
        🌎 Air Pollution Monitoring System
      </div>
        <div>
      <ul style={{display:"flex", textcolor:"white", }} className="nav-links">
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="https://wildfire-monitoring.onrender.com">Wild Fire</Link>
        </li>
      </ul>
      </div>
      {/* <div className="menu-icon" onClick={toggleMenu}>
        {isOpen ? <FaTimes /> : <FaBars />}
      </div> */}
    </nav>
  );
};

export default Navbar;
