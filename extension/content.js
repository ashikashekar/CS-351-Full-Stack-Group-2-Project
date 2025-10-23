// Detect which AI tool user is on
const AI_TOOLS = {
  'chatgpt.com': 'ChatGPT',
  'chat.openai.com': 'ChatGPT',
  'claude.ai': 'Claude',
  'gemini.google.com': 'Gemini',
  'copilot.github.com': 'GitHub Copilot',
  'perplexity.ai': 'Perplexity'
};

let currentTool = null;
let sessionStart = null;
let queryCount = 0;

// Identify current tool
for (const [domain, toolName] of Object.entries(AI_TOOLS)) {
  if (window.location.hostname.includes(domain)) {
    currentTool = toolName;
    break;
  }
}

if (currentTool) {
  sessionStart = Date.now();
  console.log(`[AI Tracker] Session started on ${currentTool}`);
  
  // Watch for ANY button clicks (simplified approach)
  document.addEventListener('click', (e) => {
    // Check if clicked element or parent is a button
    const button = e.target.closest('button');
    if (button) {
      // Log what button was clicked (for debugging)
      console.log('[AI Tracker] Button clicked:', button);
      
      // Simple heuristic: if button is near a textarea, it's probably a send button
      const nearbyTextarea = document.querySelector('textarea');
      if (nearbyTextarea && nearbyTextarea.value.trim().length > 0) {
        queryCount++;
        console.log(`[AI Tracker] Query ${queryCount} on ${currentTool}`);
      }
    }
  }, true);
  
  // Also watch for Enter key in text areas
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target.matches('textarea')) {
      const textarea = e.target;
      if (textarea.value.trim().length > 0) {
        queryCount++;
        console.log(`[AI Tracker] Query ${queryCount} on ${currentTool}`);
      }
    }
  }, true);
}

// Send data when user leaves page
window.addEventListener('beforeunload', () => {
  if (sessionStart && queryCount > 0) {
    const sessionData = {
      tool: currentTool,
      startTime: sessionStart,
      endTime: Date.now(),
      queryCount: queryCount,
      duration: Math.floor((Date.now() - sessionStart) / 1000)
    };
    
    // Store locally first
    chrome.storage.local.get(['sessions'], (result) => {
      const sessions = result.sessions || [];
      sessions.push(sessionData);
      chrome.storage.local.set({ sessions: sessions });
    });
    
    // Try to send to backend
    chrome.storage.local.get(['authToken'], (result) => {
      if (result.authToken) {
        fetch('http://localhost:5000/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${result.authToken}`
          },
          body: JSON.stringify(sessionData),
          keepalive: true
        }).catch(err => console.log('Failed to sync:', err));
      }
    });
  }
});