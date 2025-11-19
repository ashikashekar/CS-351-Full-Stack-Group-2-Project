import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({
    queries_today: 0,
    duration_today: 0,
    tools_used_today: 0
  });

  // search sessions 
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  // filter by time range
  const [timeRange, setTimeRange] = useState('today');
  const [rangeResults, setRangeResults] = useState(null);

  // work periods data
  const [workPeriods, setWorkPeriods] = useState(null);
  const [workPeriodsExpanded, setWorkPeriodsExpanded] = useState(false);


  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();

    const interval = setInterval(() => {
      fetchDashboard();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // fetches dashboard summary stats
  const fetchDashboard = async () => {
    // gets authToken from local storage 
    const token = localStorage.getItem('authToken');

    if (!token) {
      navigate('/');
      return;
    }

    try {
      // fetch requests dashboard stats from backend 
      const response = await fetch('http://localhost:5000/api/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // parses JSON and displays data in stats
      if (response.ok) {
        const data = await response.json();
        setStats(data);

        // checks if extension is running 
        if (window.chrome && window.chrome.runtime) {
          try {
            // sends token to extension
            window.chrome.runtime.sendMessage(
              'akajdephmbfeignblnhhfbpcmjkfeene',
              { action: 'setAuthToken', token: token },
              (response) => {
                if (response) console.log('Token sent to extension');
              }
            );
          } catch (err) {
            console.log('Extension not available');
          }
        }
      // clears token and redirects to login page
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

  // search sessions by AI tool name
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const token = localStorage.getItem('authToken');

    try {
      // fetch request to backend with search query 
      const response = await fetch(
        `http://localhost:5000/api/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // displays data 
      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  // filter sessions by time range 
  const handleTimeRangeFilter = async (range) => {
    setTimeRange(range);
    const token = localStorage.getItem('authToken');

    try {
      // fetch request to backend with chosen time range 
      const response = await fetch(
        `http://localhost:5000/api/sessions/range?range=${range}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      // display data
      const data = await response.json();
      setRangeResults(data);
    } catch (err) {
      console.error('Range filter failed:', err);
    }
  };

  // load work periods 
  const fetchWorkPeriods = async () => {
    const token = localStorage.getItem('authToken');

    try {
      // fetch request grouped work periods from backend 
      const response = await fetch(
        'http://localhost:5000/api/work-periods?date=today',
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      // display data
      const data = await response.json();
      setWorkPeriods(data);
    } catch (err) {
      console.error('Work periods fetch failed:', err);
    }
  };

  // load work periods when page loads 
  useEffect(() => {
    fetchWorkPeriods();
  }, []);


  // gets prompt count and displays usage level with designated color 
  const getUsageLevel = (count) => {
    if (count < 20) return { text: 'Healthy', color: '#22c55e' };
    if (count < 50) return { text: 'Moderate', color: '#eab308' };
    if (count < 80) return { text: 'High', color: '#f97316' };
    return { text: 'Critical', color: '#ef4444' };
  };

  // logout (clear tokens and redirect to login)
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    navigate('/');
  };

  const level = getUsageLevel(stats.queries_today);

  // loading screen
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>AI Usage Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      {/* search section */}
      <div className="search-section">
        <h2>Search Sessions</h2>

        {/* search bar */}
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search by tool name (chat, gem, claude...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="search-btn">Search</button>
        </form>

        {/* search results */}
        {searchResults && (
          <div className="search-results">
            <h3>
              Results for "{searchResults.query}" ({searchResults.count} found)
            </h3>

            {/* if results exist */}
            {searchResults.results.length > 0 ? (
              searchResults.results.map((result, idx) => (
                <div key={idx} className="result-card">
                  <h4>{result.word}</h4>
                  <p>{result.data.length} sessions found</p>

                  {/* displays first 5 sessions */}
                  <div className="session-list">
                    {result.data.slice(0, 5).map((session, i) => (
                      <div key={i} className="session-item">
                        <span>🕒 {new Date(session.start_time).toLocaleString()}</span>
                        <span>📊 {session.query_count} queries</span>
                        <span>
                          ⏱️ {Math.floor(session.duration / 60)}m {session.duration % 60}s
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* if there are more than 5 sessions */}
                  {result.data.length > 5 && (
                    <p className="more-sessions">
                      + {result.data.length - 5} more sessions
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="no-results">No matches</p>
            )}
          </div>
        )}
      </div>

      {/* time range filter */}
      <div className="filter-section">
        <h2>Filter by Time Range (Using BST)</h2>

        {/* dropdown and button */}
        <div className="filter-controls">
          <select
            value={timeRange}
            onChange={(e) => handleTimeRangeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>

          <button
            onClick={() => handleTimeRangeFilter(timeRange)}
            className="filter-btn"
          >
            Apply Filter
          </button>
        </div>

        {/* results */}
        {rangeResults && (
          <div className="filter-results">
            <h3>
              {rangeResults.count} sessions from{' '}
              {rangeResults.start_date.split(' ')[0]} to{' '}
              {rangeResults.end_date.split(' ')[0]}
            </h3>

            {/* if session exists */}
            {rangeResults.sessions.length > 0 ? (
              <div className="sessions-grid">
                {rangeResults.sessions.map((session, idx) => (
                  <div key={idx} className="session-card">
                    <div className="session-header">
                      <h4>{session.tool_name}</h4>
                      <span className="query-badge">
                        {session.query_count} queries
                      </span>
                    </div>

                    <div className="session-details">
                      <p>🕒 {new Date(session.start_time).toLocaleString()}</p>
                      <p>
                        ⏱️ Duration:{' '}
                        {Math.floor(session.duration / 60)}m{' '}
                        {session.duration % 60}s
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-results">No sessions found in this time range</p>
            )}
          </div>
        )}
      </div>

      {/* work periods */}
      <div className="work-periods-section">
        <div className="section-header-clickable" onClick={() => setWorkPeriodsExpanded(!workPeriodsExpanded)}>
          <h2>Work Periods Today (Using Union-Find)</h2>
          <button className="expand-btn">
            {workPeriodsExpanded ? '▼ Collapse' : '▶ Expand'}
          </button>
        </div>
        <p className="explanation">Sessions within 15 minutes are grouped into the same work period</p>
        
        {/* if expanded and there is data */}
        {workPeriodsExpanded && workPeriods && workPeriods.count > 0 ? (
          <div>
            <div className="period-summary">
              <div className="summary-item">
                <span className="summary-label">Total Work Periods:</span>
                <span className="summary-value">{workPeriods.count}</span>
              </div>
            </div>

            {/* list of work periods */}
            <div className="periods-list">
              {workPeriods.work_periods.map((period, idx) => (
                <div key={idx} className="period-card">
                  <div className="period-header">
                    <h3>Work Period {idx + 1}</h3>
                    <span className="period-time">
                      {new Date(period.start_time).toLocaleTimeString()} - {new Date(period.end_time).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  {/* stats */}
                  <div className="period-stats">
                    <div className="period-stat">
                      <span className="stat-icon">📊</span>
                      <div>
                        <div className="stat-value">{period.total_queries}</div>
                        <div className="stat-label">Total Queries</div>
                      </div>
                    </div>
                    
                    <div className="period-stat">
                      <span className="stat-icon">⏱️</span>
                      <div>
                        <div className="stat-value">{Math.floor(period.total_duration / 60)}m</div>
                        <div className="stat-label">Total Duration</div>
                      </div>
                    </div>
                    
                    <div className="period-stat">
                      <span className="stat-icon">🔧</span>
                      <div>
                        <div className="stat-value">{period.session_count}</div>
                        <div className="stat-label">Sessions</div>
                      </div>
                    </div>
                  </div>

                  {/* tools used */}
                  <div className="tools-used">
                    <strong>Tools Used:</strong> {period.tools_used.join(', ')}
                  </div>

                  {/* dropdown with sessions */}
                  <details className="session-details-dropdown">
                    <summary>View Individual Sessions ({period.session_count})</summary>
                    <div className="individual-sessions">
                      {period.sessions.map((session, sIdx) => (
                        <div key={sIdx} className="mini-session">
                          <span className="tool-name">{session.tool_name}</span>
                          <span>{new Date(session.start_time).toLocaleTimeString()}</span>
                          <span>{session.query_count} queries</span>
                          <span>{session.duration}s</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              ))}
            </div>
          </div>
        ) : workPeriodsExpanded && workPeriods ? (
          <p className="no-results">No work periods found for today</p>
        ) : null}
      </div>



      {/* stats cards */}
      <div className="stats-container">

        {/* todays total prompts */}
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

        {/* time spent */}
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

        {/* different tools used */}
        <div className="stat-card">
          <div className="stat-icon">🔧</div>
          <h3>Different AI Tools Used</h3>
          <p className="stat-value">
            {stats.tools_used_today || 0}
          </p>
          <p className="stat-label">
            {stats.tools_used_today === 1 ? 'tool' : 'tools'} today
          </p>
        </div>
      </div>

      {/* alerts */}
      {stats.queries_today >= 50 && (
        <div className="alert-banner" style={{ backgroundColor: level.color }}>
          <span className="alert-icon">⚠️</span>
          <div>
            <strong>High Usage Alert</strong>
            <p>
              You've made {stats.queries_today} prompts today. Consider taking
              a break!
            </p>
          </div>
        </div>
      )}

      {stats.queries_today >= 80 && (
        <div className="cooldown-message">
          <span className="cooldown-icon">⏸️</span>
          <p>
            <strong>Cooldown Recommended:</strong> Try stepping away for 10
            minutes.
          </p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
