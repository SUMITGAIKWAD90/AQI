import './Card.css';

const Card = ({ children, className = '', title, subtitle, icon, action }) => {
  return (
    <div className={`ui-card ${className}`}>
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
    </div>
  );
};

export default Card;
