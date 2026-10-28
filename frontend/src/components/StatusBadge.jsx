import React from 'react';
import { Clock, Search, CheckCircle, ShieldAlert } from 'lucide-react';

const StatusBadge = ({ status = 'New' }) => {
  const st = (status || 'New').toLowerCase();

  let badgeClass = 'badge-new';
  let Icon = Clock;

  if (st === 'investigating') {
    badgeClass = 'badge-investigating';
    Icon = Search;
  } else if (st === 'resolved') {
    badgeClass = 'badge-resolved';
    Icon = CheckCircle;
  } else if (st === 'false positive') {
    badgeClass = 'badge-false-positive';
    Icon = ShieldAlert;
  }

  return (
    <span className={`badge ${badgeClass} d-inline-flex align-items-center gap-1 px-2.5 py-1 rounded-pill fs-7`}>
      <Icon size={12} />
      <span>{status}</span>
    </span>
  );
};

export default StatusBadge;
