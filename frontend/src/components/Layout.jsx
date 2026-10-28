import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, 
  LayoutDashboard, 
  Activity, 
  ShieldAlert, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Clock,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date().toUTCString().slice(17, 25) + ' UTC');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toUTCString().slice(17, 25) + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
    { to: '/analyze', label: 'Upload & ML Analysis', icon: Activity },
    { to: '/alerts', label: 'Alerts & Triage', icon: ShieldAlert },
    { to: '/reports', label: 'Audit Reports', icon: FileText },
    { to: '/settings', label: 'Platform Settings', icon: Settings },
  ];

  return (
    <div className="soc-wrapper">
      {/* Sidebar */}
      <aside className={`soc-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="p-3 d-flex align-items-center justify-content-between border-bottom border-secondary border-opacity-25" style={{ height: '64px' }}>
          <div className="d-flex align-items-center gap-2.5">
            <div 
              className="p-2 rounded-3 d-flex align-items-center justify-content-center"
              style={{ background: 'linear-gradient(135deg, #2563eb, #06b6d4)', boxShadow: '0 0 12px rgba(37, 99, 235, 0.5)' }}
            >
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <div className="fw-bold text-white tracking-wide" style={{ fontSize: '0.95rem', letterSpacing: '0.04em' }}>
                CYBERSHIELD
              </div>
              <div className="text-info font-mono" style={{ fontSize: '0.68rem', letterSpacing: '0.08em' }}>
                SOC RISK DETECTOR
              </div>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-sm btn-link text-secondary d-lg-none p-1"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="py-3 flex-grow-1 overflow-y-auto">
          <div className="px-3 mb-2 text-uppercase text-secondary font-mono fw-semibold" style={{ fontSize: '0.68rem', letterSpacing: '0.1em' }}>
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `soc-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-top border-secondary border-opacity-25 bg-black bg-opacity-20">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="d-flex align-items-center gap-2 overflow-hidden">
              <div 
                className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold flex-shrink-0"
                style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', fontSize: '0.8rem' }}
              >
                {user?.username ? user.username.slice(0, 2).toUpperCase() : 'SO'}
              </div>
              <div className="overflow-hidden">
                <div className="text-white fw-semibold text-truncate" style={{ fontSize: '0.85rem' }}>
                  {user?.username || 'SOC Analyst'}
                </div>
                <div className="text-secondary text-truncate" style={{ fontSize: '0.72rem' }}>
                  {user?.role || 'Analyst'}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-sm text-secondary p-1 hover-text-danger"
              title="Sign Out"
              style={{ transition: 'color 0.2s' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="soc-content">
        {/* Topbar */}
        <header className="soc-topbar">
          <div className="d-flex align-items-center gap-3">
            <button
              type="button"
              className="btn btn-sm btn-link text-white d-lg-none p-1"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={22} />
            </button>
            <div className="d-flex align-items-center gap-2">
              <div className="live-indicator">
                <span className="pulse-dot"></span>
                <span>SOC ONLINE</span>
              </div>
              <span className="d-none d-md-inline text-secondary font-mono fs-7">
                ENGINE: <span className="text-info">ML PIPELINE ACTIVE</span>
              </span>
            </div>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="d-none d-sm-flex align-items-center gap-1.5 text-secondary font-mono fs-7">
              <Clock size={14} className="text-primary" />
              <span>{currentTime}</span>
            </div>
            <div className="d-flex align-items-center gap-2 px-2.5 py-1 rounded-pill" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <UserCheck size={14} className="text-success" />
              <span className="text-white fw-medium fs-7">{user?.username}</span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="p-3 p-md-4 flex-grow-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
