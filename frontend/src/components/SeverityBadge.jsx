import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';

const SeverityBadge = ({ severity = 'Low', showIcon = true }) => {
  const sev = (severity || 'Low').toLowerCase();

  let badgeClass = 'badge-low';
  let Icon = CheckCircle2;

  if (sev === 'critical') {
    badgeClass = 'badge-critical';
    Icon = AlertCircle;
  } else if (sev === 'high') {
    badgeClass = 'badge-high';
    Icon = AlertTriangle;
  } else if (sev === 'medium') {
    badgeClass = 'badge-medium';
    Icon = Info;
  }

  return (
    <span className={`badge ${badgeClass} d-inline-flex align-items-center gap-1 px-2.5 py-1 rounded-pill fs-7`}>
      {showIcon && <Icon size={13} />}
      <span>{severity}</span>
    </span>
  );
};

export default SeverityBadge;
