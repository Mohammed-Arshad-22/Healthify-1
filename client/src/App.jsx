import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </AccessibilityProvider>
    </LanguageProvider>
  );
}
