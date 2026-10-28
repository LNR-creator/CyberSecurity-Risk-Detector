import React from 'react';
import { Shield } from 'lucide-react';

const LoadingSpinner = ({ message = 'Processing Analytics Pipeline...' }) => {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center p-5">
      <div className="position-relative mb-3">
        <div 
          className="spinner-border text-primary" 
          style={{ width: '3.5rem', height: '3.5rem', borderWidth: '3px' }} 
          role="status"
        >
          <span className="visually-hidden">Loading...</span>
        </div>
        <div 
          className="position-absolute top-50 start-50 translate-middle text-info"
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          <Shield size={22} className="text-primary" />
        </div>
      </div>
      <p className="text-secondary mb-0 fw-semibold fs-6 tracking-wide">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
