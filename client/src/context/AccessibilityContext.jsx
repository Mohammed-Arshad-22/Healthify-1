import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext(null);

export const AccessibilityProvider = ({ children }) => {
  const [highContrast, setHighContrast] = useState(() => {
    return localStorage.getItem('healthify_high_contrast') === 'true';
  });

  const [largeText, setLargeText] = useState(() => {
    return localStorage.getItem('healthify_large_text') === 'true';
  });

  const [simpleMode, setSimpleMode] = useState(() => {
    return localStorage.getItem('healthify_simple_mode') === 'true';
  });

  const [voiceAssistance, setVoiceAssistance] = useState(() => {
    return localStorage.getItem('healthify_voice_assist') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('healthify_high_contrast', highContrast);
    if (highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem('healthify_large_text', largeText);
    if (largeText) {
      document.documentElement.classList.add('large-text');
    } else {
      document.documentElement.classList.remove('large-text');
    }
  }, [largeText]);

  useEffect(() => {
    localStorage.setItem('healthify_simple_mode', simpleMode);
  }, [simpleMode]);

  useEffect(() => {
    localStorage.setItem('healthify_voice_assist', voiceAssistance);
  }, [voiceAssistance]);

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        setHighContrast,
        largeText,
        setLargeText,
        simpleMode,
        setSimpleMode,
        voiceAssistance,
        setVoiceAssistance,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export default AccessibilityContext;
