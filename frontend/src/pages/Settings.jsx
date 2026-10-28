import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  Server, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  Cpu,
  KeyRound
} from 'lucide-react';
import { settingsService } from '../services/settingsService';
import LoadingSpinner from '../components/LoadingSpinner';

const Settings = () => {
  const [profile, setProfile] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit profile form
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('Senior SOC Analyst');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await settingsService.getSettings();
      if (res.success) {
        setProfile(res.profile);
        setSystemInfo(res.system_info);
        setUsername(res.profile.username || '');
        setRole(res.profile.role || 'Senior SOC Analyst');
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage(null);
    setProfileError(null);

    try {
      const res = await settingsService.updateProfile({ username, role });
      if (res.success) {
        setProfileMessage('Analyst profile updated successfully.');
        setProfile((prev) => ({ ...prev, username, role }));
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await settingsService.changePassword(currentPassword, newPassword);
      if (res.success) {
        setPasswordMessage('Password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Querying Platform Configuration & Credentials..." />;
  }

  return (
    <div className="container-fluid p-0">
      {/* Top Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="fw-bold text-white mb-0">Platform Settings & Telemetry</h4>
            <span className="badge rounded-pill bg-primary bg-opacity-20 text-primary border border-primary border-opacity-25 px-2 py-0.5 fs-7 font-mono">
              SYSTEM CONFIG
            </span>
          </div>
          <p className="text-secondary fs-7 mb-0 mt-1">
            Manage your SOC analyst credentials, authentication passphrase, and view machine learning engine parameters.
          </p>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Profile & Password */}
        <div className="col-12 col-lg-6">
          {/* Analyst Profile */}
          <div className="soc-card mb-4">
            <div className="soc-card-header">
              <h6 className="soc-card-title">
                <User size={18} className="text-primary" />
                SOC Analyst Profile
              </h6>
              <span className="text-secondary font-mono fs-8">ID: {profile?.id?.slice(0, 8)}...</span>
            </div>

            {profileMessage && (
              <div className="p-3 mb-3 rounded-3 d-flex align-items-center gap-2 bg-success bg-opacity-15 border border-success border-opacity-30">
                <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                <div className="text-success fs-7 mb-0">{profileMessage}</div>
              </div>
            )}

            {profileError && (
              <div className="p-3 mb-3 rounded-3 d-flex align-items-center gap-2 bg-danger bg-opacity-15 border border-danger border-opacity-30">
                <AlertTriangle size={16} className="text-danger flex-shrink-0" />
                <div className="text-danger fs-7 mb-0">{profileError}</div>
              </div>
            )}

            <form onSubmit={handleUpdateProfile}>
              <div className="mb-3">
                <label className="stat-label d-block mb-1.5">Registered Email (Read Only)</label>
                <input
                  type="text"
                  disabled
                  value={profile?.email || ''}
                  className="soc-input opacity-75 font-mono fs-7"
                />
              </div>

              <div className="mb-3">
                <label className="stat-label d-block mb-1.5">Analyst Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="soc-input fs-7"
                />
              </div>

              <div className="mb-3">
                <label className="stat-label d-block mb-1.5">Role Designation</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="soc-input fs-7"
                >
                  <option value="Senior SOC Analyst">Senior SOC Analyst</option>
                  <option value="Lead Incident Responder">Lead Incident Responder</option>
                  <option value="Threat Intelligence Hunter">Threat Intelligence Hunter</option>
                  <option value="Security Operations Engineer">Security Operations Engineer</option>
                  <option value="Chief Information Security Officer">Chief Information Security Officer</option>
                </select>
              </div>

              <div className="mb-4">
                <label className="stat-label d-block mb-1.5">Account Created</label>
                <span className="text-secondary font-mono fs-7">
                  {profile?.created_at ? profile.created_at.slice(0, 19).replace('T', ' ') : 'N/A'} UTC
                </span>
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="btn btn-cyber-primary"
              >
                <Save size={15} />
                <span>{profileSaving ? 'Saving...' : 'Save Profile Changes'}</span>
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="soc-card">
            <div className="soc-card-header">
              <h6 className="soc-card-title">
                <Lock size={18} className="text-warning" />
                Security Credentials & Passphrase
              </h6>
            </div>

            {passwordMessage && (
              <div className="p-3 mb-3 rounded-3 d-flex align-items-center gap-2 bg-success bg-opacity-15 border border-success border-opacity-30">
                <CheckCircle2 size={16} className="text-success flex-shrink-0" />
                <div className="text-success fs-7 mb-0">{passwordMessage}</div>
              </div>
            )}

            {passwordError && (
              <div className="p-3 mb-3 rounded-3 d-flex align-items-center gap-2 bg-danger bg-opacity-15 border border-danger border-opacity-30">
                <AlertTriangle size={16} className="text-danger flex-shrink-0" />
                <div className="text-danger fs-7 mb-0">{passwordError}</div>
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="mb-3">
                <label className="stat-label d-block mb-1.5">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="soc-input fs-7"
                />
              </div>

              <div className="mb-3">
                <label className="stat-label d-block mb-1.5">New Passphrase</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="soc-input fs-7"
                />
              </div>

              <div className="mb-4">
                <label className="stat-label d-block mb-1.5">Confirm New Passphrase</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="soc-input fs-7"
                />
              </div>

              <button
                type="submit"
                disabled={passwordSaving}
                className="btn btn-cyber-secondary"
              >
                <KeyRound size={15} />
                <span>{passwordSaving ? 'Updating...' : 'Update Passphrase'}</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Engine & Architecture Telemetry */}
        <div className="col-12 col-lg-6">
          <div className="soc-card mb-4">
            <div className="soc-card-header">
              <h6 className="soc-card-title">
                <Server size={18} className="text-cyan" />
                Detection Engine Architecture
              </h6>
              <span className="badge rounded-pill bg-success bg-opacity-20 text-success font-mono fs-8">
                HEALTHY
              </span>
            </div>

            <div className="d-flex flex-column gap-3">
              <div className="p-3 rounded-3 bg-black bg-opacity-20 border border-secondary border-opacity-15">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="stat-label mb-0">Platform Name</span>
                  <span className="text-white font-mono fw-bold fs-7">{systemInfo?.platform_name}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="stat-label mb-0">Release Version</span>
                  <span className="text-info font-mono fs-7">v{systemInfo?.version}</span>
                </div>
              </div>

              <div className="p-3 rounded-3 bg-black bg-opacity-20 border border-secondary border-opacity-15">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="stat-label mb-0">Database Persistence Engine</span>
                  <span className="badge rounded-pill bg-primary bg-opacity-20 text-primary font-mono fs-8">
                    {systemInfo?.database_engine}
                  </span>
                </div>
                <div className="text-secondary font-mono" style={{ fontSize: '0.72rem' }}>
                  {systemInfo?.database_status}
                </div>
              </div>

              <div className="p-3 rounded-3 bg-black bg-opacity-20 border border-secondary border-opacity-15">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="stat-label mb-0">Maximum Upload Limit</span>
                  <span className="text-white font-mono fw-bold fs-7">{systemInfo?.upload_limit_mb} MB</span>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="stat-label mb-0">Maximum Rows Ingest</span>
                  <span className="text-white font-mono fw-bold fs-7">{systemInfo?.max_rows?.toLocaleString()} records</span>
                </div>
              </div>

              <div className="p-3 rounded-3 bg-black bg-opacity-20 border border-secondary border-opacity-15">
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="stat-label mb-0">Default Contamination</span>
                  <span className="text-cyan font-mono fw-bold fs-7">{systemInfo?.default_contamination}</span>
                </div>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="stat-label mb-0">Random State Seed</span>
                  <span className="text-white font-mono fs-7">{systemInfo?.random_state}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Machine Learning Pipeline Architecture Overview */}
          <div className="soc-card">
            <div className="soc-card-header">
              <h6 className="soc-card-title">
                <Cpu size={18} className="text-primary" />
                Machine Learning Pipeline Specifications
              </h6>
            </div>
            <div className="font-mono fs-7 text-secondary">
              <p className="mb-2">
                <strong className="text-white">1. Preprocessing Engine:</strong> Numerical scaling via Scikit-Learn StandardScaler, one-hot encoding for categorical network protocols, and robust missing value imputation.
              </p>
              <p className="mb-2">
                <strong className="text-white">2. Unsupervised Isolation Forest:</strong> Ensembles 100 decision trees to isolate multi-dimensional traffic anomalies without requiring prior attack labels.
              </p>
              <p className="mb-2">
                <strong className="text-white">3. Supervised Random Forest Classifier:</strong> Evaluates accuracy, precision, and recall when labeled attack indicators are provided.
              </p>
              <p className="mb-0">
                <strong className="text-white">4. Dynamic Risk Engine:</strong> Calibrates risk scores between 0 and 100 based on isolation decision function, packet spikes, connection duration, and failed login counts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
