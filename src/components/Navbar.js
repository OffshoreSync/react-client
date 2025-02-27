import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Material UI components
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  useMediaQuery,
  useTheme,
  Select,
  MenuItem,
  Menu,
  Divider,
  Avatar,
  Container,
  Button
} from '@mui/material';

// Material UI icons
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SettingsIcon from '@mui/icons-material/Settings';
import WavesIcon from '@mui/icons-material/Waves';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import AccountCircle from '@mui/icons-material/AccountCircle';
import LanguageIcon from '@mui/icons-material/Language';
import PersonIcon from '@mui/icons-material/Person';

// Import country flag component
import ReactCountryFlag from 'react-country-flag';

// Import i18n
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

// Import cookies and API
import { getCookie, setCookie, removeCookie, api } from '../utils/apiUtils';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(getCookie('language') || 'en');
  const [anchorEl, setAnchorEl] = useState(null);
  const [languageMenuAnchor, setLanguageMenuAnchor] = useState(null);
  const theme = useTheme();
  const { t } = useTranslation();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const { user, loading, setUser } = useAuth();

  // Logout method
  const handleLogout = () => {
    // Remove authentication cookies
    removeCookie('token');
    removeCookie('refreshToken');
    
    // Clear user state
    setUser(null);
    
    // Close any open menus
    handleClose();
    
    // Navigate to login
    navigate('/login');
  };

  // Language change method
  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    
    // Store language preference in cookie
    setCookie('language', newLanguage, { 
      path: '/', 
      maxAge: 30 * 24 * 60 * 60  // 30 days
    });
    
    // Change app language
    i18n.changeLanguage(newLanguage);
  };

  const handleNavigation = (path) => {
    navigate(path);
    handleClose();
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageMenu = (event) => {
    setLanguageMenuAnchor(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setLanguageMenuAnchor(null);
  };

  // Menu items for drawer
  const menuItems = user ? [
    {
      text: t('navbar.home'),
      icon: <HomeIcon />,
      onClick: () => handleNavigation('/dashboard')
    },
    {
      text: t('navbar.friends'),
      icon: <PersonAddIcon />,
      onClick: () => handleNavigation('/friends')
    },
    {
      text: t('navbar.settings'),
      icon: <SettingsIcon />,
      onClick: () => handleNavigation('/settings')
    },
    {
      text: t('navbar.sync'),
      icon: <WavesIcon />,
      onClick: () => handleNavigation('/sync')
    },
    {
      text: t('navbar.logout'),
      icon: <LogoutIcon />,
      onClick: handleLogout
    }
  ] : [
    {
      text: t('navbar.login'),
      icon: <LoginIcon />,
      onClick: () => handleNavigation('/login')
    }
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
                    handleClose();
                    handleLanguageMenu(e);
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
                    onClick={handleLanguageMenu}
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
                onClose={handleLanguageClose}
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
                      changeLanguage(lang);
                      handleLanguageClose();
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
              {user?.profilePicture ? (
                <IconButton 
                  onClick={handleMenu}
                  sx={{ 
                    padding: 0,
                    marginLeft: 2
                  }}
                >
                  <Avatar 
                    src={user.profilePicture} 
                    alt={user.name || 'User'} 
                    sx={{ width: 40, height: 40 }}
                  />
                </IconButton>
              ) : (
                <IconButton
                  onClick={handleMenu}
                  sx={{ 
                    marginLeft: 2,
                    color: 'white' // Set icon color to white
                  }}
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
        open={Boolean(anchorEl)}
        onClose={handleClose}
        sx={{
          '& .MuiDrawer-paper': {
            width: 250
          }
        }}
      >
        <List>
          {menuItems.map((item, index) => (
            <ListItem 
              button 
              key={item.text} 
              onClick={item.onClick}
              sx={{
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>
    </>
  );
}

export default Navbar;
