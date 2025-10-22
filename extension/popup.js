document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const queriesEl = document.getElementById('queries');
  const pendingEl = document.getElementById('pending');
  const dashboardBtn = document.getElementById('openDashboard');
  const loginBtn = document.getElementById('loginBtn');

  // Check auth status
  chrome.storage.local.get(['authToken', 'sessions'], (result) => {
    if (result.authToken) {
      statusEl.textContent = 'Tracking active';
      statusEl.className = 'status active';
      loginBtn.style.display = 'none';
    } else {
      statusEl.textContent = 'Not logged in';
      statusEl.className = 'status inactive';
      loginBtn.style.display = 'block';
    }

    // Show pending sessions
    const sessions = result.sessions || [];
    pendingEl.textContent = sessions.length;

    // Calculate today's queries
    const today = new Date().toDateString();
    const todaySessions = sessions.filter(s => 
      new Date(s.startTime).toDateString() === today
    );
    const totalQueries = todaySessions.reduce((sum, s) => sum + s.queryCount, 0);
    queriesEl.textContent = totalQueries;
  });

  // Open dashboard
  dashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
  });

  // Open login
  loginBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000/' });
  });
});