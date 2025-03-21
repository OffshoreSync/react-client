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
  ListItemButton,
  Box,
  useMediaQuery,
  useTheme,
  Select,
  MenuItem,
  Menu,
  Divider,
  Avatar,
  Container,
  Button,
  Link
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
import GitHubIcon from '@mui/icons-material/GitHub';
import SecurityIcon from '@mui/icons-material/Security';
import GavelIcon from '@mui/icons-material/Gavel';

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
      text: t('navbar.home'),
      icon: <HomeIcon />,
      onClick: () => handleNavigation('/')
    },
    {
      text: t('navbar.register'),
      icon: <PersonAddIcon />,
      onClick: () => handleNavigation('/register')
    },
    {
      text: t('navbar.login'),
      icon: <LoginIcon />,
      onClick: () => handleNavigation('/login')
    },
    { divider: true },
    {
      text: t('navbar.privacy'),
      icon: <SecurityIcon />,
      onClick: () => handleNavigation('/privacy-policy')
    },
    {
      text: t('navbar.terms'),
      icon: <GavelIcon />,
      onClick: () => handleNavigation('/terms')
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
                    <Box 
                      component="span"
                      sx={{ 
                        display: 'inline-flex',
                        mr: 1,
                        '& .flag-icon': {
                          width: '1.5em',
                          height: '1em'
                        }
                      }}
                    >
                      <ReactCountryFlag 
                        countryCode={
                          lang === 'en' ? 'US' : 
                          lang === 'es' ? 'ES' : 
                          lang === 'pt' ? 'BR' : ''
                        } 
                        svg
                        className="flag-icon"
                      />
                    </Box>
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
                    marginLeft: 2,
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
                  }}
                >
                  <Avatar 
                    src={user.profilePicture} 
                    alt={user.name || 'User'} 
                    sx={{ 
                      width: 40, 
                      height: 40,
                      border: '2px solid rgba(255, 255, 255, 0.8)',
                      backgroundColor: 'rgba(255, 255, 255, 0.9)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'scale(1.05)'
                      }
                    }}
                  />
                </IconButton>
              ) : (
                <IconButton
                  onClick={handleMenu}
                  sx={{ 
                    marginLeft: 2,
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                    }
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
            width: 250,
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        {/* Main Menu */}
        <List sx={{ flexGrow: 1 }}>
          {menuItems.map((item, index) => (
            item.divider ? (
              <Divider key={`divider-${index}`} />
            ) : (
              <ListItem 
                key={item.text}
                disablePadding
              >
                <ListItemButton onClick={item.onClick}>
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>)
          ))}
        </List>

        {/* Footer Section */}
        <Box sx={{ mt: 'auto', borderTop: 1, borderColor: 'divider' }}>
          <List>
            {/* GitHub Icon */}
            <ListItem sx={{ justifyContent: 'center', py: 1 }}>
              <IconButton
                component="a"
                href="https://github.com/OffshoreSync"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  color: 'text.primary',
                  '&:hover': {
                    color: 'primary.main'
                  }
                }}
              >
                <GitHubIcon fontSize="large" />
              </IconButton>
            </ListItem>

            <ListItem disablePadding>
              <ListItemButton 
                component="a" 
                href="/privacy-policy"
                sx={{ textDecoration: 'none', color: 'inherit' }}
              >
                <ListItemIcon>
                  <SecurityIcon sx={{ color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={t('legal.privacyPolicy.title')}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: 'text.secondary'
                  }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton 
                component="a" 
                href="/terms"
                sx={{ textDecoration: 'none', color: 'inherit' }}
              >
                <ListItemIcon>
                  <GavelIcon sx={{ color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText 
                  primary={t('legal.termsAndConditions.title')}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: 'text.secondary'
                  }}
                />
              </ListItemButton>
            </ListItem>
            <ListItem sx={{ justifyContent: 'center', py: 0 }}>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontStyle: 'italic' }}
              >
                v0.2.0
              </Typography>
            </ListItem>
            <ListItem sx={{ justifyContent: 'center', py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                &copy; {new Date().getFullYear()} OffshoreSync
              </Typography>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* End of Drawer */}
    </>
  );
}

export default Navbar;
