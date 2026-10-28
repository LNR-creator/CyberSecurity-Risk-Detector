import React from 'react';
import { ShieldCheck, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const EmptyState = ({
  icon: Icon = ShieldCheck,
  title = 'No Data Available',
  message = 'Upload a cybersecurity network traffic or security log dataset to begin automated risk detection.',
  actionText = 'Upload Dataset',
  actionLink = '/analyze'
}) => {
  return (
    <div className="soc-card text-center py-5 my-3">
      <div 
        className="d-inline-flex p-3 rounded-circle mb-3" 
        style={{ backgroundColor: 'rgba(37, 99, 235, 0.12)', border: '1px solid rgba(37, 99, 235, 0.25)' }}
      >
        <Icon size={38} className="text-primary" />
      </div>
      <h5 className="fw-bold text-white mb-2">{title}</h5>
      <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '460px', fontSize: '0.92rem' }}>
        {message}
      </p>
      {actionLink && (
        <Link to={actionLink} className="btn btn-cyber-primary">
          <Plus size={16} />
          <span>{actionText}</span>
        </Link>
      )}
    </div>
  );
};

export default EmptyState;
