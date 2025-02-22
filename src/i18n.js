import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { useCookies } from 'react-cookie';

import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import ptTranslations from './locales/pt.json';

// Function to get initial language
const getInitialLanguage = () => {
  // Check if this is running in browser context
  if (typeof window !== 'undefined') {
    const cookies = document.cookie.split('; ').reduce((acc, curr) => {
      const [key, value] = curr.split('=');
      acc[key] = value;
      return acc;
    }, {});
    
    return cookies.language || 'en';
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      es: { translation: esTranslations },
      pt: { translation: ptTranslations }
    },
    lng: getInitialLanguage(), // Set initial language
    fallbackLng: 'en', // Fallback to English if translation is missing
    interpolation: {
      escapeValue: false // React already escapes values
    }
  });

// Add language change listener to set cookie
i18n.on('languageChanged', (lng) => {
  document.cookie = `language=${lng}; path=/; max-age=${365 * 24 * 60 * 60}`; // 1 year
});

export default i18n;
