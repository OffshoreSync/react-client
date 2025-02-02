import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Consistent blue color
      light: '#4791db',
      dark: '#115293'
    },
    secondary: {
      main: '#dc004e',
      light: '#ff4081',
      dark: '#9a0036'
    },
    background: {
      default: '#ffffff',
      paper: '#f5f5f5'
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
    }
  }
});

export default theme;
