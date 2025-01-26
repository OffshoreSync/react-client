import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { blue, green } from '@mui/material/colors';

import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';

// Create custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: blue[600],
    },
    secondary: {
      main: green[600],
    },
    background: {
      default: '#f4f4f4',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

// Authentication check component
const PrivateRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Home route component with authentication logic
const HomeRoute = () => {
  const isAuthenticated = !!localStorage.getItem('token');
  return isAuthenticated ? <Home /> : <Home />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
