import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, Minimize2 } from "lucide-react";
import clsx from "clsx";
import "./MiniAqiMap.css";

export default function MiniAqiMap({
  title = "AQI Map",
  subtitle = "Live markers",
  onToggle,
  children,
}) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded((prev) => !prev);
  };

  useEffect(() => {
    if (typeof onToggle !== "function") return;
    onToggle(expanded);
  }, [expanded, onToggle]);

  return (
    <div className="mini-map-wrapper">
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="mini-map-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleToggle}
          />
        )}
      </AnimatePresence>

      <motion.section
        className={clsx("mini-map-card", expanded && "is-expanded")}
        layout
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      >
        <div className="mini-map-header">
          <div>
            <span className="mini-map-title">{title}</span>
            <span className="mini-map-subtitle">{subtitle}</span>
          </div>
          <button type="button" className="mini-map-toggle" onClick={handleToggle}>
            {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
        <div className="mini-map-body">{children}</div>
      </motion.section>
    </div>
  );
}
