import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText 
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';

function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const menuItems = isLoggedIn ? [
    { text: 'Home', icon: <HomeIcon />, onClick: () => handleNavigation('/') },
    { text: 'Dashboard', icon: <DashboardIcon />, onClick: () => handleNavigation('/dashboard') },
    { text: 'Profile Settings', icon: <PersonIcon />, onClick: () => handleNavigation('/settings') },
    { text: 'Logout', icon: <LogoutIcon />, onClick: handleLogout }
  ] : [
    { text: 'Home', icon: <HomeIcon />, onClick: () => handleNavigation('/') },
    { text: 'Login', icon: <PersonIcon />, onClick: () => handleNavigation('/login') },
    { text: 'Register', icon: <PersonIcon />, onClick: () => handleNavigation('/register') }
  ];

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Offshore Worker Calendar
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <List>
          {menuItems.map((item, index) => (
            <ListItem button key={index} onClick={item.onClick}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>
    </>
  );
}

export default Navbar;
