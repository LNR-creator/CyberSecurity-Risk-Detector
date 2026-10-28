import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Mail, ArrowRight, ShieldAlert, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Senior SOC Analyst');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(username, email, password, role);
      } else {
        await login(username, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    const demoUser = 'analyst_demo';
    const demoPass = 'CyberSec!2026';
    const demoEmail = 'analyst@cybershield.internal';

    try {
      // Try logging in first
      await login(demoUser, demoPass);
      navigate('/dashboard');
    } catch (err) {
      // If user doesn't exist, register demo user
      try {
        await register(demoUser, demoEmail, demoPass, 'Lead Incident Responder');
        navigate('/dashboard');
      } catch (regErr) {
        setError(regErr.response?.data?.message || regErr.message || 'Failed to auto-provision demo account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="d-flex align-items-center justify-content-center px-3 py-5"
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 20%, #172554 0%, #070a13 70%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Decorative Rings */}
      <div 
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          border: '1px solid rgba(37, 99, 235, 0.1)',
          pointerEvents: 'none',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div 
        style={{
          position: 'absolute',
          width: '850px',
          height: '850px',
          borderRadius: '50%',
          border: '1px solid rgba(6, 182, 212, 0.05)',
          pointerEvents: 'none',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div className="w-100" style={{ maxWidth: '440px', position: 'relative', zIndex: 10 }}>
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div 
            className="d-inline-flex p-3 rounded-4 mb-3"
            style={{ 
              background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
              boxShadow: '0 0 25px rgba(37, 99, 235, 0.5)'
            }}
          >
            <Shield size={36} className="text-white" />
          </div>
          <h2 className="fw-bold text-white mb-1 tracking-tight" style={{ letterSpacing: '-0.02em' }}>
            CYBERSHIELD SOC
          </h2>
          <p className="text-secondary fs-7 font-mono mb-0">
            ENTERPRISE ANOMALY & RISK DETECTION PLATFORM
          </p>
        </div>

        {/* Card Container */}
        <div className="soc-card p-4">
          {/* Mode Tabs */}
          <div className="d-flex rounded-3 p-1 mb-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--soc-border)' }}>
            <button
              type="button"
              className={`btn btn-sm w-50 fw-semibold rounded-2 ${!isRegister ? 'btn-cyber-primary' : 'text-secondary'}`}
              style={{ transition: 'all 0.2s' }}
              onClick={() => { setIsRegister(false); setError(null); }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`btn btn-sm w-50 fw-semibold rounded-2 ${isRegister ? 'btn-cyber-primary' : 'text-secondary'}`}
              style={{ transition: 'all 0.2s' }}
              onClick={() => { setIsRegister(true); setError(null); }}
            >
              Register Analyst
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 mb-3 rounded-3 d-flex align-items-center gap-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <ShieldAlert size={18} className="text-danger flex-shrink-0" />
              <div className="text-danger fs-7 mb-0">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="stat-label d-block mb-1.5">Analyst Username</label>
              <div className="position-relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. sec_analyst_01"
                  className="soc-input ps-5"
                />
                <User size={16} className="text-secondary position-absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {isRegister && (
              <>
                <div className="mb-3">
                  <label className="stat-label d-block mb-1.5">Work Email Address</label>
                  <div className="position-relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="analyst@enterprise.com"
                      className="soc-input ps-5"
                    />
                    <Mail size={16} className="text-secondary position-absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="stat-label d-block mb-1.5">SOC Role Designation</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="soc-input"
                  >
                    <option value="Senior SOC Analyst">Senior SOC Analyst</option>
                    <option value="Lead Incident Responder">Lead Incident Responder</option>
                    <option value="Threat Intelligence Hunter">Threat Intelligence Hunter</option>
                    <option value="Security Operations Engineer">Security Operations Engineer</option>
                    <option value="Chief Information Security Officer">Chief Information Security Officer</option>
                  </select>
                </div>
              </>
            )}

            <div className="mb-4">
              <label className="stat-label d-block mb-1.5">Security Passphrase</label>
              <div className="position-relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="soc-input ps-5"
                />
                <Lock size={16} className="text-secondary position-absolute" style={{ left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-cyber-primary w-100 justify-content-center py-2.5 fs-6"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{isRegister ? 'Authorize Account' : 'Authenticate Session'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Button */}
          <div className="mt-4 pt-3 border-top border-secondary border-opacity-25 text-center">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="btn btn-cyber-secondary w-100 justify-content-center fs-7 py-2"
            >
              <KeyRound size={15} className="text-cyan" />
              <span>Launch Demo SOC Analyst Mode (1-Click)</span>
            </button>
            <div className="text-secondary font-mono mt-2" style={{ fontSize: '0.7rem' }}>
              Instant authorization with preloaded test credentials
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-3 text-secondary font-mono" style={{ fontSize: '0.72rem' }}>
          <span>CYBERSHIELD ENGINE v1.0.0</span> &bull; <span>TLS ENCRYPTED</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
