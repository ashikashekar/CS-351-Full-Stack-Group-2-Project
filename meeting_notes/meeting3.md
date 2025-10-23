# Team Meeting Notes
**Date:** October 16, 2025  
**Attendees:** Joy, Ashika, Inem, Riya  
**Recorder:** Inem  

---

## Agenda
- Discuss backend logic and data structure selection  
- Plan database schema and authentication flow  
- Assign coding responsibilities  

---

## Discussion Summary
- The backend will use **Flask** for APIs and **PostgreSQL** for data storage.  
- The team discussed using **Trie** and **Binary Search Trees** for tracking and querying AI tool usage.  
- They agreed to track user sessions either **daily or weekly**, depending on analytics volume.  
- Joy suggested exploring **Union-Find** to group data for dashboard statistics.  
- The team confirmed **Flask** will handle user authentication (register, login) and AI tool detection via URLs.

---

## Task Assignments
| Member | Task |
|---------|------|
| **Ashika** | Continue building frontend pages (`Login`, `Dashboard`) with mock data |
| **Joy** | Work with Ashika on styling and user input validation |
| **Inem** | Build Flask API endpoints for authentication and session tracking |
| **Riya** | Write backend logic for AI detection using URLs and data structures |

---

## Blockers
- Need to finalize which data structures (BST vs. Hashing) provide the most efficient search for AI tool detection.  


---

## Next Steps
- Merge working branches for frontend and backend into `main`.  
- Schedule next meeting to finalize dashboard analytics and discuss integration.
