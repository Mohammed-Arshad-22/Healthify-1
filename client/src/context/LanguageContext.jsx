import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../locales/en/translation.json';
import ta from '../locales/ta/translation.json';
import hi from '../locales/hi/translation.json';
import te from '../locales/te/translation.json';

const translations = { en, ta, hi, te };

export const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
];

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem('healthify_language') || 'en';
  });

  const changeLanguage = (langCode) => {
    if (translations[langCode]) {
      setCurrentLang(langCode);
      localStorage.setItem('healthify_language', langCode);
      document.documentElement.lang = langCode;
    }
  };

  useEffect(() => {
    document.documentElement.lang = currentLang;
  }, [currentLang]);

  // Nested translation resolver: t("dashboard.healthOverview")
  const t = (path, fallback = '') => {
    if (!path) return fallback;
    const keys = path.split('.');
    
    // First lookup in current language
    let result = translations[currentLang];
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        result = null;
        break;
      }
    }

    // Fallback to English if missing
    if (result === null || result === undefined) {
      let enResult = translations.en;
      for (const key of keys) {
        if (enResult && typeof enResult === 'object' && key in enResult) {
          enResult = enResult[key];
        } else {
          enResult = null;
          break;
        }
      }
      return enResult || fallback || path;
    }

    return result;
  };

  return (
    <LanguageContext.Provider value={{ currentLang, changeLanguage, t, languages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
