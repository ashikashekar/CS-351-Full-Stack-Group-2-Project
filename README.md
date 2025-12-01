# AI Usage Tracker

Monitor your AI tool usage and maintain healthy habits.

CS 351 Advanced Data Structures
Fall 2025
University of Illinois Chicago

Team Members: Ashika, Inemesit, Joy, Riya

---

## Demo Video

[https://github.com/user-attachments/assets/YOUR-VIDEO-ID-HERE](https://github.com/user-attachments/assets/YOUR-VIDEO-ID-HERE)
(Replace this link with your uploaded demo video URL)

---

## Overview

AI Usage Tracker is a full stack application that automatically logs usage on ChatGPT, Claude, Gemini, and Perplexity through a Chrome extension.
The dashboard displays total queries, duration, and tool usage statistics.
Tracking is privacy conscious and collects metadata only, never prompt content.

This README provides all installation steps and run instructions required.

---

# Required Software

Install the following before proceeding:

* Python
* Node.js
* PostgreSQL
* Google Chrome
* Git

Verify installations:

```bash
python --version
node --version
psql --version
```

---

# Installation and Setup

## Step 1: Clone the Repository

```bash
git clone https://github.com/ashikashekar/CS-351-Full-Stack-Group-2-Project.git
cd CS-351-Full-Stack-Group-2-Project
```

---

# Step 2: Database Setup

Start PostgreSQL.

Windows: Start through Services
Mac:

```bash
brew services start postgresql@14
```

Linux:

```bash
sudo systemctl start postgresql
```

Open PostgreSQL:

```bash
psql -U postgres
```

Create database and tables:

```sql
CREATE DATABASE ai_tracker;
\c ai_tracker;

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ai_tools (
    tool_id SERIAL PRIMARY KEY,
    tool_name VARCHAR(50) UNIQUE NOT NULL,
    url_pattern VARCHAR(255) NOT NULL
);

CREATE TABLE sessions (
    session_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    tool_id INT REFERENCES ai_tools(tool_id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    query_count INT DEFAULT 0,
    session_duration INT
);

INSERT INTO ai_tools (tool_name, url_pattern) VALUES
('ChatGPT', 'chatgpt.com'),
('Claude', 'claude.ai'),
('Gemini', 'gemini.google.com'),
('Perplexity', 'perplexity.ai');
```

Exit:

```
\q
```

---

# Step 3: Backend Setup (Flask)

Navigate to backend:

```bash
cd backend
```

Create virtual environment.

Windows:

```bash
python -m venv venv
venv\Scripts\activate
```

Mac/Linux:

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install flask flask-cors psycopg2-binary pyjwt werkzeug python-dotenv
```

Set database credentials in `backend/app.py`:

```python
password="YOUR_POSTGRES_PASSWORD"
```

Start backend:

```bash
python app.py
```

Backend runs on:

```
http://localhost:5000
```

---

# Step 4: Frontend Setup (React)

Open a new terminal:

```bash
cd frontend
npm install
npm start
```

Frontend runs on:

```
http://localhost:3000
```

---

# Step 5: Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable Developer Mode
3. Click Load Unpacked
4. Select the `extension` folder in the project
5. Ensure the extension is enabled

---

# Running the Application

Three components must run at the same time.

---

## Terminal 1: Backend (Flask)

```bash
cd backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

python app.py
```

Expected output:

```
* Running on http://127.0.0.1:5000
```

---

## Terminal 2: Frontend (React)

```bash
cd frontend
npm start
```

Expected behavior:

* Browser opens automatically
* You should see the landing page at [http://localhost:3000](http://localhost:3000)

---

## Terminal 3: PostgreSQL

Check that PostgreSQL is running:

```bash
psql -U postgres -d ai_tracker
```

If it connects successfully, type:

```
\q
```

---

# Syncing Extension Token

If the extension does not automatically sync, follow these steps.

## Step 1: Get your token

1. Open the dashboard
2. Press F12 to open Developer Console
3. Run:

   ```javascript
   localStorage.getItem('authToken')
   ```
4. Copy the token string

---

## Step 2: Save the token in the extension

1. Click the extension icon
2. Right-click the popup and choose Inspect
3. In the popup console, paste:

```javascript
chrome.storage.local.set({
  authToken: 'PASTE_YOUR_TOKEN_HERE'
}, () => {
  console.log('Token saved!');
  location.reload();
});
```

4. Replace `PASTE_YOUR_TOKEN_HERE` with your actual token
5. Press Enter
6. The extension will reload and begin tracking

---

# Usage

1. Open `http://localhost:3000`
2. Create an account and log in
3. Visit any supported AI tool (ChatGPT, Claude, Gemini, Perplexity)
4. The extension automatically starts tracking
5. Return to the dashboard to view statistics

---

# License

This project was created for educational purposes as part of CS 351 at the University of Illinois Chicago.
