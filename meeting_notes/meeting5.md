# Team Meeting Notes 
**Date:** November 13, 2025  
**Attendees:** Joy, Ashika, Inem, Riya  
**Recorder:** Joy  

## Agenda
- Test all data structure features together
- Identify and fix bugs

---

## Discussion Summary

### Feature Testing Results

**Search Feature (Trie):** Working
- Successfully searches by tool name prefix
- Results display correctly with session details
- Fast response time

**Time Filter (BST):** Working  
- All four options work (today, yesterday, week, month)
- Sessions display in clean card layout
- Efficient query performance

**Work Periods (Union-Find):** Working
- Correctly groups sessions within 15 minutes
- Shows total queries and duration per period
- Collapsible view implemented successfully

**Extension Tracking:** Partially Working
- Works consistently on Gemini and Claude
- Inconsistent on ChatGPT (some prompts missed)
- Decision: Demo using Gemini for reliability

### Bugs Fixed During Meeting
1. Dashboard not auto-refreshing: Added 5-second interval
2. Work periods always expanded: Made collapsible with state
3. "Different AI tools used" metric was 0: Added COUNT(DISTINCT) query


## Action Items

| Task | Owner |
|------|------- |
| Create presentation slides | Joy |
| Write README.md | Joy |
| Practice demo walkthrough | Everyone |
| Schedule MS4 meeting with TA | Ashika |
| Test on fresh Chrome profile | Everyone | 
| Commit all code changes | Everyone |

---


## MS4 Meeting Details
**Scheduled:** November 19, 2025 at 6:30 PM  
**Format:** Virtual on Zoom 
