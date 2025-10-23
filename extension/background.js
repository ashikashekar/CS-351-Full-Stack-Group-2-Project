// Listen for auth token from web app
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setAuthToken') {
    chrome.storage.local.set({ authToken: request.token }, () => {
      console.log('Auth token saved');
      sendResponse({ success: true });
    });
    return true;
  }
});

// Sync stored sessions periodically
setInterval(async () => {
  chrome.storage.local.get(['sessions', 'authToken'], async (result) => {
    if (result.sessions && result.sessions.length > 0 && result.authToken) {
      for (const session of result.sessions) {
        try {
          const response = await fetch('http://localhost:5000/api/sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${result.authToken}`
            },
            body: JSON.stringify(session)
          });
          
          if (response.ok) {
            // Remove synced session
            const newSessions = result.sessions.filter(s => s !== session);
            chrome.storage.local.set({ sessions: newSessions });
          }
        } catch (err) {
          console.log('Sync failed:', err);
        }
      }
    }
  });
}, 60000); // Every minute