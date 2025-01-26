import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css'; 

function Home() {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Offshore Worker Calendar</h1>
        
        <section className="project-description">
          <h2>Manage Your Offshore Working Regime</h2>
          <p>
            Our application is designed specifically for offshore industry professionals 
            to track and manage their complex working schedules. Whether you're in drilling, 
            production, maintenance, or support roles, we provide a comprehensive solution 
            for your unique work-life balance.
          </p>
        </section>
        
        <section className="key-features">
          <h2>Key Features</h2>
          <ul>
            <li>
              <strong>Flexible Working Regimes</strong>
              <p>Choose from predefined 7/7, 14/14, 28/28 schedules or create a custom regime</p>
            </li>
            <li>
              <strong>User Authentication</strong>
              <p>Secure registration and login with personalized dashboards</p>
            </li>
            <li>
              <strong>Role-Based Access</strong>
              <p>Tailored experience for different offshore roles</p>
            </li>
            <li>
              <strong>Global Offshore Support</strong>
              <p>Works with offshore professionals from multiple countries</p>
            </li>
          </ul>
        </section>
        
        <section className="cta-section">
          <h2>Ready to Get Started?</h2>
          <p>
            Track your offshore working days, manage your schedule, 
            and bring clarity to your work-life balance.
          </p>
          <div className="cta-buttons">
            <button 
              className="login-button" 
              onClick={handleLogin}
            >
              Login to Your Account
            </button>
            <button 
              className="register-button" 
              onClick={() => navigate('/register')}
            >
              Create New Account
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Home;
