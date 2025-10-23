// AI Usage Tracker:
// Tracks how many prompts user sends 

const AI_TOOLS = {
  "chatgpt.com": "ChatGPT",
  "chat.openai.com": "ChatGPT",
  "claude.ai": "Claude",
  "gemini.google.com": "Gemini",
  "copilot.github.com": "GitHub Copilot",
  "perplexity.ai": "Perplexity"
};

let currentTool = null;
let sessionStart = null;
let queryCount = 0;
let lastQueryTime = 0;
const THROTTLE_MS = 1500;

// --- Identify which AI tool is active ---
for (const [domain, toolName] of Object.entries(AI_TOOLS)) {
  if (window.location.hostname.includes(domain)) {
    currentTool = toolName;
    break;
  }
}

if (currentTool) {
  sessionStart = Date.now();
  console.log(`[AI Tracker] Session started on ${currentTool}`);

  // shared detection logic (Gemini, Claude, Perplexity, etc.)
  function maybeCountQuery() {
    const now = Date.now();
    if (now - lastQueryTime < THROTTLE_MS) return;
    lastQueryTime = now;
    queryCount++;
    console.log(`[AI Tracker] Query ${queryCount} on ${currentTool}`);
  }

  function attachListeners() {
    const input = document.querySelector("textarea, [contenteditable='true']");
    const sendBtn = document.querySelector("button");

    if (input && !input.aiTrackerBound) {
      input.addEventListener(
        "keydown",
        (e) => {
          if (e.key === "Enter" && !e.shiftKey) maybeCountQuery();
        },
        true
      );
      input.aiTrackerBound = true;
    }

    if (sendBtn && !sendBtn.aiTrackerBound) {
      sendBtn.addEventListener("click", () => maybeCountQuery(), true);
      sendBtn.aiTrackerBound = true;
    }
  }

  const observer = new MutationObserver(() => attachListeners());
  observer.observe(document.body, { childList: true, subtree: true });
  attachListeners();


  // ChatGPT-specific detection 
  // todo: need to do more research

  if (currentTool === "ChatGPT") {
    console.log("[AI Tracker] ChatGPT detection enabled");

    // watch for Enter key on the contenteditable div
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // ChatGPT uses contenteditable div with id="prompt-textarea"
        const promptDiv = document.querySelector("#prompt-textarea");
        if (promptDiv && promptDiv.textContent && promptDiv.textContent.trim().length > 0) {
          console.log("[AI Tracker] ChatGPT Enter detected with content");
          maybeCountQuery();
        }
      }
    }, true);

    // watch for send button clicks (already working)
    document.addEventListener("click", (e) => {
      const button = e.target.closest("button");
      if (button) {
        const ariaLabel = button.getAttribute("aria-label");
        const dataTestId = button.getAttribute("data-testid");
        if ((ariaLabel && ariaLabel.toLowerCase().includes("send")) || 
            (dataTestId && dataTestId.includes("send"))) {
          console.log("[AI Tracker] ChatGPT send button clicked");
          maybeCountQuery();
        }
      }
    }, true);
  }

  // GitHub Copilot Web Chat Detection (todo: need to also do research on this)

  if (currentTool === "GitHub Copilot") {
    console.log("[AI Tracker] Copilot detection enabled");

    const attachCopilotListeners = () => {
      const input = document.querySelector(
        "textarea, [data-testid='chat-text-area']"
      );
      const sendBtn = document.querySelector("button");

      if (input && !input.aiTrackerBound) {
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !e.shiftKey && input.value?.trim())
            maybeCountQuery();
        });
        input.aiTrackerBound = true;
      }

      if (sendBtn && !sendBtn.aiTrackerBound) {
        sendBtn.addEventListener("click", () => maybeCountQuery());
        sendBtn.aiTrackerBound = true;
      }
    };

    const copilotObserver = new MutationObserver(() => attachCopilotListeners());
    copilotObserver.observe(document.body, { childList: true, subtree: true });
    attachCopilotListeners();
  }

  // send session data when tab closes (via background.js)

  window.addEventListener("beforeunload", () => {
    if (sessionStart && queryCount > 0) {
      console.log(`[AI Tracker] Sending ${queryCount} queries to backend`);

      const sessionData = {
        tool: currentTool,
        startTime: sessionStart,
        endTime: Date.now(),
        queryCount: queryCount,
        duration: Math.floor((Date.now() - sessionStart) / 1000)
      };

      // safe check — only call chrome APIs if available
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        chrome.storage.local.get(["sessions"], (result) => {
          const sessions = result.sessions || [];
          sessions.push(sessionData);
          chrome.storage.local.set({ sessions: sessions });
        });

        chrome.storage.local.get(["authToken"], (result) => {
          if (result.authToken && chrome.runtime?.sendMessage) {
            chrome.runtime.sendMessage({
              type: "SEND_SESSION",
              token: result.authToken,
              payload: sessionData
            });
          }
        });
      } else {
        console.warn("[AI Tracker] chrome API unavailable in this context");
      }
    }
  });
}
