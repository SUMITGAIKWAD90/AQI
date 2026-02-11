import { motion } from "motion/react";
import './Card.css';

const Card = ({ children, className = '', title, subtitle, icon, action }) => {
  return (
    <motion.section
      className={`ui-card ${className}`}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      {(title || subtitle || action) && (
        <div className="ui-card-header">
          <div className="ui-card-header-content">
            {icon && <span className="ui-card-icon">{icon}</span>}
            <div>
              {title && <h3 className="ui-card-title">{title}</h3>}
              {subtitle && <p className="ui-card-subtitle">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="ui-card-action">{action}</div>}
        </div>
      )}
      <div className="ui-card-body">
        {children}
      </div>
    </motion.section>
  );
};

export default Card;
