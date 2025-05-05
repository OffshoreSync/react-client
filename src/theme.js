import { createTheme } from '@mui/material/styles';

// Create theme based on mode (light or dark)
const getTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'dark' ? '#70B7F1' : '#1976d2', // Blue accent color - #70B7F1 for dark mode
      light: mode === 'dark' ? '#9DCBF5' : '#4791db',
      dark: mode === 'dark' ? '#4A9DEE' : '#115293'
    },
    secondary: {
      main: '#dc004e',
      light: '#ff4081',
      dark: '#9a0036'
    },
    background: {
      default: mode === 'light' ? '#f5f5f5' : '#09090b', // zinc-950 for dark mode
      paper: mode === 'light' ? '#ffffff' : '#1e1e1e'
    }
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1976d2', // Consistent navbar color
          color: '#ffffff'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme, ownerState }) => ({
          transition: 'background-color 0.3s ease',
          ...(theme.palette.mode === 'dark' && {
            backgroundColor: (
              // Use zinc color palette for dark mode
              !ownerState.elevation ? '#18181b' : // zinc-900 (default)
              ownerState.elevation === 1 ? '#27272a' : // zinc-800
              ownerState.elevation === 2 ? '#27272a' : // zinc-800
              ownerState.elevation === 3 ? '#3f3f46' : // zinc-700
              ownerState.elevation === 4 ? '#3f3f46' : // zinc-700
              ownerState.elevation >= 6 && ownerState.elevation < 16 ? '#3f3f46' : // zinc-700
              ownerState.elevation >= 16 && ownerState.elevation < 24 ? '#27272a' : // zinc-800
              ownerState.elevation >= 24 ? '#18181b' : // zinc-900
              '#18181b' // Default to zinc-900
            )
          })
        })
      }
    },
    MuiSwitch: {
      styleOverrides: {
        root: {
          width: 42,
          height: 26,
          padding: 0,
          margin: 8,
        },
        switchBase: {
          padding: 1,
          '&.Mui-checked': {
            transform: 'translateX(16px)',
            color: '#fff',
            '& + .MuiSwitch-track': {
              opacity: 1,
              backgroundColor: mode === 'dark' ? '#8796A5' : '#aab4be',
            },
          },
        },
        thumb: {
          width: 24,
          height: 24,
        },
        track: {
          borderRadius: 13,
          border: '1px solid #bdbdbd',
          backgroundColor: mode === 'dark' ? '#39393D' : '#e9e9e9',
          opacity: 1,
          transition: 'background-color 0.2s ease',
        },
      },
    }
  }
});

export { getTheme };
