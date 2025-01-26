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
  ListItemText,
  Box,
  Container,
  Button,
  useMediaQuery,
  useTheme
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import WavesIcon from '@mui/icons-material/Waves';

function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isLoggedIn = !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
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
    { text: 'Login', icon: <PersonIcon />, onClick: () => handleNavigation('/login') }
  ];

  return (
    <>
      <AppBar 
        position="sticky" 
        sx={{ 
          background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          borderBottom: '1px solid rgba(255,255,255,0.12)'
        }}
      >
        <Container maxWidth="lg">
          <Toolbar 
            disableGutters 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              height: 64
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <WavesIcon sx={{ mr: 1, color: 'white' }} />
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  fontWeight: 600, 
                  letterSpacing: 1,
                  color: 'white'
                }}
              >
                OffshoreSync
              </Typography>
            </Box>

            {isSmallScreen ? (
              <IconButton
                size="large"
                edge="end"
                color="inherit"
                aria-label="menu"
                onClick={() => setDrawerOpen(true)}
              >
                <MenuIcon />
              </IconButton>
            ) : (
              <Box>
                {menuItems.map((item, index) => (
                  <Button
                    key={index}
                    color="inherit"
                    startIcon={item.icon}
                    onClick={item.onClick}
                    sx={{
                      mx: 1,
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)'
                      }
                    }}
                  >
                    {item.text}
                  </Button>
                ))}
              </Box>
            )}
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 250,
            background: theme.palette.background.default,
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16
          }
        }}
      >
        <List sx={{ pt: 2 }}>
          {menuItems.map((item, index) => (
            <ListItem 
              button 
              key={index} 
              onClick={item.onClick}
              sx={{
                borderRadius: 2,
                mx: 1,
                my: 0.5,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover
                }
              }}
            >
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
