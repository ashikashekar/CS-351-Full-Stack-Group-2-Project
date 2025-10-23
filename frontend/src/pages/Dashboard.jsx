import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({
    queries_today: 0,
    duration_today: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
    
    // added: auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchDashboard();
    }, 5000);
    
    // added: cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
      navigate('/');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        
        // ===== Send token to Chrome Extension =====
        if (window.chrome && window.chrome.runtime) {
          try {
            window.chrome.runtime.sendMessage(
              'akajdephmbfeignblnhhfbpcmjkfeene', // your extension ID
              { action: 'setAuthToken', token: token },
              (response) => {
                if (response) console.log('Token sent to extension');
              }
            );
          } catch (err) {
            console.log('Extension not available');
          }
        }
      } else {
        localStorage.removeItem('authToken');
        navigate('/');
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const getUsageLevel = (count) => {
    if (count < 20) return { text: 'Healthy', color: '#22c55e' };
    if (count < 50) return { text: 'Moderate', color: '#eab308' };
    if (count < 80) return { text: 'High', color: '#f97316' };
    return { text: 'Critical', color: '#ef4444' };
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    navigate('/');
  };

  const level = getUsageLevel(stats.queries_today);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>AI Usage Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>
      
      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <h3>Total Prompts Today</h3>
          <p className="stat-value" style={{ color: level.color }}>
            {stats.queries_today}
          </p>
          <p className="stat-label" style={{ color: level.color }}>
            {level.text} usage
          </p>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <h3>Time Spent Today</h3>
          <p className="stat-value">
            {Math.floor(stats.duration_today / 60)} min
          </p>
          <p className="stat-label">
            {Math.floor(stats.duration_today / 3600)} hours{' '}
            {Math.floor((stats.duration_today % 3600) / 60)} minutes
          </p>
        </div>
      </div>

      {stats.queries_today >= 50 && (
        <div className="alert-banner" style={{ backgroundColor: level.color }}>
          <span className="alert-icon">⚠️</span>
          <div>
            <strong>High Usage Alert</strong>
            <p>You've made {stats.queries_today} prompts today. Consider taking a break!</p>
          </div>
        </div>
      )}

      {stats.queries_today >= 80 && (
        <div className="cooldown-message">
          <span className="cooldown-icon">⏸️</span>
          <p>
            <strong>Cooldown Recommended:</strong> Try stepping away for 10 minutes to avoid overreliance.
          </p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
