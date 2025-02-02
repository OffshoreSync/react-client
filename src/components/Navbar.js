import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Avatar,
  useMediaQuery,
  useTheme,
  Select,
  MenuItem,
  Menu
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import WavesIcon from '@mui/icons-material/Waves';
import SettingsIcon from '@mui/icons-material/Settings';
import LanguageIcon from '@mui/icons-material/Language';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ReactCountryFlag from 'react-country-flag';

// Import i18n
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const { t } = useTranslation();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isLoggedIn = !!localStorage.getItem('token');
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'en');
  const [languageMenuAnchor, setLanguageMenuAnchor] = useState(null);
  const [user, setUser] = useState(null);

  // Handle profile picture update event
  const handleProfilePictureUpdate = () => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setUser(storedUser);
  };

  // Fetch user from localStorage on component mount and add event listener
  useEffect(() => {
    // Initial user fetch
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setUser(storedUser);

    // Add custom event listener for profile picture updates
    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate);

    // Cleanup event listener
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    };
  }, []);

  const handleLanguageChange = (event) => {
    const newLanguage = event.target.value;
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Dispatch event to update profile picture
    window.dispatchEvent(new Event('profilePictureUpdated'));
    
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  // Modify menu items to remove Settings, Sync, and Logout buttons
  const menuItems = isLoggedIn ? [
    {
      text: t('navbar.home'),
      icon: <HomeIcon />,
      onClick: () => {
        navigate('/dashboard');
        setDrawerOpen(false);
      }
    }
  ] : [
    { text: t('common.home'), icon: <HomeIcon />, onClick: () => handleNavigation('/') },
    { text: t('common.login'), icon: <PersonIcon />, onClick: () => handleNavigation('/login') }
  ];

  // Additional drawer-only menu items
  const drawerMenuItems = isLoggedIn ? [
    {
      text: t('navbar.friends'),
      icon: <PersonAddIcon />,
      onClick: () => {
        navigate('/friends');
        setDrawerOpen(false);
      }
    },
    {
      text: t('navbar.settings'),
      icon: <SettingsIcon />,
      onClick: () => {
        navigate('/settings');
        setDrawerOpen(false);
      }
    },
    {
      text: t('navbar.sync'),
      icon: <WavesIcon />,
      onClick: () => {
        navigate('/sync');
        setDrawerOpen(false);
      }
    },
    {
      text: t('navbar.logout'),
      icon: <LogoutIcon />,
      onClick: handleLogout
    }
  ] : [];

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
                {t('common.appName')}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isSmallScreen ? (
                <IconButton 
                  id="language-select"
                  onClick={(e) => {
                    setDrawerOpen(false);
                    setLanguageMenuAnchor(e.currentTarget);
                  }}
                  sx={{ 
                    color: 'white',
                    '&:hover': { 
                      backgroundColor: 'rgba(255,255,255,0.1)' 
                    }
                  }}
                >
                  <LanguageIcon />
                </IconButton>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                  <IconButton 
                    id="language-select"
                    onClick={(e) => setLanguageMenuAnchor(e.currentTarget)}
                    sx={{ 
                      color: 'white',
                      '&:hover': { 
                        backgroundColor: 'rgba(255,255,255,0.1)' 
                      }
                    }}
                  >
                    <LanguageIcon />
                  </IconButton>
                </Box>
              )}

              <Menu
                anchorEl={languageMenuAnchor}
                open={Boolean(languageMenuAnchor)}
                onClose={() => setLanguageMenuAnchor(null)}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                {['en', 'es', 'pt'].map((lang) => (
                  <MenuItem 
                    key={lang} 
                    onClick={() => {
                      handleLanguageChange({ target: { value: lang } });
                      setLanguageMenuAnchor(null);
                    }}
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      fontWeight: language === lang ? 'bold' : 'normal'
                    }}
                  >
                    <ReactCountryFlag 
                      countryCode={
                        lang === 'en' ? 'US' : 
                        lang === 'es' ? 'ES' : 
                        lang === 'pt' ? 'BR' : ''
                      } 
                      svg 
                      style={{ width: '1.5em', height: '1em' }} 
                    />
                    {t(`navbar.languages.${lang}`)}
                  </MenuItem>
                ))}
              </Menu>

              {/* Profile Picture or Menu Button */}
              {user && user.profilePicture ? (
                <IconButton 
                  onClick={() => setDrawerOpen(true)}
                  sx={{ 
                    ml: 1,
                    p: 0,
                    border: '2px solid white',
                    borderRadius: '50%'
                  }}
                >
                  <Avatar 
                    src={user.profilePicture} 
                    alt="User Profile" 
                    sx={{ width: 40, height: 40 }} 
                  />
                </IconButton>
              ) : (
                <IconButton
                  size="large"
                  edge="end"
                  color="inherit"
                  aria-label="menu"
                  onClick={() => setDrawerOpen(true)}
                >
                  <MenuIcon />
                </IconButton>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Drawer for mobile view */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 250
          }
        }}
      >
        <List sx={{ pt: 2 }}>
          {/* Regular menu items */}
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

          {/* Drawer-only menu items */}
          {drawerMenuItems.map((item, index) => (
            <ListItem 
              button 
              key={`drawer-${index}`} 
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
