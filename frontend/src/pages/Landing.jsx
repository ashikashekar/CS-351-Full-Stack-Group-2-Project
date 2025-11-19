import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

function Landing() {
  const [showConsent, setShowConsent] = useState(false);
  const [agreedToConsent, setAgreedToConsent] = useState(false);
  const navigate = useNavigate();

  const handleLearnMore = () => {
    setShowConsent(true);
  };

  const handleAgree = () => {
    if (!agreedToConsent) return;
    
    // Store consent in localStorage
    localStorage.setItem('userConsent', 'true');
    navigate('/login');
  };

  return (
    <div className="landing-container">
      {!showConsent ? (
        // Welcome Screen
        <div className="welcome-screen">
          <div className="welcome-content">
            <h1>Welcome to AI Overuse Awareness</h1>
            <p className="tagline">
              Take control of your AI usage and maintain healthy habits
            </p>
            
            <div className="features">
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <h3>Track Your Usage</h3>
                <p>Monitor how often you interact with AI tools like ChatGPT, Perplexity, and Gemini</p>
              </div>
              
              <div className="feature-item">
                <span className="feature-icon">⏱️</span>
                <h3>Time Awareness</h3>
                <p>See exactly how much time you spend using AI assistance</p>
              </div>
              
              <div className="feature-item">
                <span className="feature-icon">🎯</span>
                <h3>Stay Balanced</h3>
                <p>Get gentle reminders to take breaks and avoid over-dependence</p>
              </div>
            </div>

            <div className="cta-buttons">
            <button onClick={() => setShowConsent(true)} className="get-started-btn">
                Get Started
            </button>
            </div>
          </div>
        </div>
      ) : (
        // Privacy & Consent Screen
        <div className="consent-screen">
          <div className="consent-content">
            <h1>Privacy & Data Collection Consent</h1>
            
            <div className="consent-box">
              <h2>What We Collect</h2>
              <ul>
                <li><strong>Timestamps:</strong> When you use AI tools</li>
                <li><strong>Tool Names:</strong> Which AI service you used (ChatGPT, Gemini, etc.)</li>
                <li><strong>Query Counts:</strong> How many prompts you sent</li>
                <li><strong>Session Duration:</strong> How long you spent on each tool</li>
              </ul>

              <h2>What We DON'T Collect</h2>
              <ul>
                <li>Your actual prompts or conversations</li>
                <li>Personal information from AI responses</li>
                <li>Any content you create with AI tools</li>
                <li>Your browsing history outside AI tools</li>
              </ul>

              <h2>Your Privacy Rights</h2>
              <ul>
                <li>Your data is stored securely and never shared</li>
                <li>You have full access to view all collected data</li>
              </ul>

              <div className="consent-checkbox">
                <label>
                  <input 
                    type="checkbox" 
                    checked={agreedToConsent}
                    onChange={(e) => setAgreedToConsent(e.target.checked)}
                  />
                  <span>
                    I understand and agree to the data collection practices described above. 
                    I consent to having my AI usage patterns tracked for personal awareness purposes.
                  </span>
                </label>
              </div>
            </div>

            <div className="consent-actions">
              <button onClick={() => setShowConsent(false)} className="back-btn">
                Back
              </button>
              <button 
                onClick={handleAgree} 
                className="agree-btn"
                disabled={!agreedToConsent}
              >
                I Agree & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Landing;
