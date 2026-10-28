import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = '#3b82f6', subtitle }) => {
  return (
    <div className="stat-card h-100">
      <div>
        <div className="stat-label">{title}</div>
        <div className="stat-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
        {subtitle && <div className="text-secondary fs-7 mt-1">{subtitle}</div>}
      </div>
      {Icon && (
        <div 
          className="stat-icon-wrapper" 
          style={{ 
            backgroundColor: `${color}18`, 
            color: color,
            border: `1px solid ${color}35` 
          }}
        >
          <Icon size={24} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
