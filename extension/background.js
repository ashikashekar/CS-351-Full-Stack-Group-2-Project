// Background service worker
// Handles auth token, background sync, and direct session uploads

// 1. save auth token sent from web app
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // store JWT
  if (request.action === "setAuthToken") {
    chrome.storage.local.set({ authToken: request.token }, () => {
      console.log("[AI Tracker] Auth token saved");
      sendResponse({ success: true });
    });
    return true;
  }

  // handle session POST requests from content.js (Option 1)
  if (request.type === "SEND_SESSION") {
    console.log("[AI Tracker] Background received session data:", request.payload);

    fetch("http://localhost:5000/api/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${request.token}`
      },
      body: JSON.stringify(request.payload)
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        console.log("[AI Tracker] Background sent successfully");
      })
      .catch((err) => console.error("[AI Tracker] Background send failed:", err));
  }
});

// 2. periodically sync any unsent sessions (failsafe)
setInterval(async () => {
  chrome.storage.local.get(["sessions", "authToken"], async (result) => {
    if (result.sessions && result.sessions.length > 0 && result.authToken) {
      const remaining = [];

      for (const session of result.sessions) {
        try {
          const response = await fetch("http://localhost:5000/api/sessions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${result.authToken}`
            },
            body: JSON.stringify(session)
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          console.log("[AI Tracker] Synced stored session:", session.tool);
        } catch (err) {
          console.warn("[AI Tracker] Sync failed, keeping session:", err);
          remaining.push(session);
        }
      }

      // update storage with any unsynced sessions
      chrome.storage.local.set({ sessions: remaining });
    }
  });
}, 5000); // every 5 seconds
