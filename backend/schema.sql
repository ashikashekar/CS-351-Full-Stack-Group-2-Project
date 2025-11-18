CREATE DATABASE ai_tracker;

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
('GitHub Copilot', 'copilot.github.com'),
('Perplexity', 'perplexity.ai');
