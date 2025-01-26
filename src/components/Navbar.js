import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem('token');

  // Determine which links to show based on login status
  const renderLinks = () => {
    if (isLoggedIn) {
      return (
        <>
          <Link 
            to="/dashboard" 
            className={location.pathname === '/dashboard' ? 'active' : ''}
          >
            Dashboard
          </Link>
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'active' : ''}
          >
            Home
          </Link>
        </>
      );
    } else {
      return (
        <>
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'active' : ''}
          >
            Home
          </Link>
          <Link 
            to="/login" 
            className={location.pathname === '/login' ? 'active' : ''}
          >
            Login
          </Link>
          <Link 
            to="/register" 
            className={location.pathname === '/register' ? 'active' : ''}
          >
            Register
          </Link>
        </>
      );
    }
  };

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem',
      backgroundColor: '#f4f4f4',
      borderBottom: '1px solid #ddd'
    }}>
      <div style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: '#333'
      }}>
        Offshore Worker Calendar
      </div>
      <div style={{
        display: 'flex',
        gap: '1rem'
      }}>
        {renderLinks()}
      </div>
    </nav>
  );
}

export default Navbar;
