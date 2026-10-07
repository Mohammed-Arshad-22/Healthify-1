import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Globe, 
  Eye, 
  Bell, 
  Menu, 
  Sparkles, 
  ShieldAlert,
  User,
  LogOut,
  Sliders
} from 'lucide-react';
import { useTranslation, languages } from '../../context/LanguageContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { Dropdown, DropdownItem } from '../ui/Dropdown';
import { Dialog } from '../ui/Dialog';

export const TopBar = ({ onToggleSidebar, user, onLogout }) => {
  const { currentLang, changeLanguage, t } = useTranslation();
  const { 
    highContrast, setHighContrast, 
    largeText, setLargeText, 
    simpleMode, setSimpleMode 
  } = useAccessibility();
  const [showA11yModal, setShowA11yModal] = useState(false);
  const navigate = useNavigate();

  const currentLangObj = languages.find(l => l.code === currentLang) || languages[0];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Mobile hamburger + Brand */}
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Heart className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                Healthify
                <span className="hidden sm:inline-flex text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  Copilot
                </span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium leading-tight">Personal Healthcare</p>
            </div>
          </Link>
        </div>

        {/* Right Actions: Emergency Card, Language, Accessibility, Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Emergency Health Card Quick Access (High Visibility) */}
          <Link
            to="/emergency"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all text-xs font-semibold shadow-xs"
            title="Immediate Access Emergency Health Card"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600 animate-pulse" />
            <span className="hidden sm:inline">{t('nav.emergency')}</span>
            <span className="sm:hidden">SOS</span>
          </Link>

          {/* Multilingual Selector */}
          <Dropdown
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                aria-label="Choose Language"
              >
                <Globe className="w-3.5 h-3.5 text-teal-600" />
                <span className="font-semibold">{currentLangObj.native}</span>
              </button>
            }
          >
            <div className="p-2 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Select Language
            </div>
            {languages.map((lang) => (
              <DropdownItem
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
              >
                <div className="flex items-center justify-between w-full">
                  <span>{lang.native}</span>
                  <span className="text-xs text-slate-400">{lang.name}</span>
                </div>
              </DropdownItem>
            ))}
          </Dropdown>

          {/* Accessibility Options Button */}
          <button
            type="button"
            onClick={() => setShowA11yModal(true)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            title="Accessibility settings"
            aria-label="Accessibility options"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* User Profile / Auth */}
          {user ? (
            <Dropdown
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-2 p-1 pl-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                  </div>
                  <span className="text-xs font-medium text-slate-700 hidden md:inline max-w-[100px] truncate">
                    {user.name || 'User'}
                  </span>
                </button>
              }
            >
              <div className="p-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{user.name || 'User'}</p>
                <p className="text-[11px] text-slate-500 truncate">{user.phone || user.email}</p>
              </div>
              <DropdownItem onClick={() => navigate('/profile')} icon={<User className="w-4 h-4" />}>
                {t('nav.profile')}
              </DropdownItem>
              <DropdownItem onClick={onLogout} danger icon={<LogOut className="w-4 h-4" />}>
                {t('auth.logout')}
              </DropdownItem>
            </Dropdown>
          ) : (
            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-xs"
            >
              {t('auth.login')}
            </Link>
          )}
        </div>
      </div>

      {/* Accessibility Dialog */}
      <Dialog
        isOpen={showA11yModal}
        onClose={() => setShowA11yModal(false)}
        title="Accessibility Settings"
        description="Customize display options for optimal comfort, clarity, and readability."
      >
        <div className="space-y-4 pt-2">
          {/* High Contrast */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-900">High Contrast Mode</p>
              <p className="text-xs text-slate-500">Increases contrast ratios for maximum legibility</p>
            </div>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
              className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
            />
          </div>

          {/* Large Text */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-900">Large Text Sizing</p>
              <p className="text-xs text-slate-500">Enlarges typography across all healthcare sections</p>
            </div>
            <input
              type="checkbox"
              checked={largeText}
              onChange={(e) => setLargeText(e.target.checked)}
              className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
            />
          </div>

          {/* Simple Mode */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="text-sm font-semibold text-slate-900">Simple / Senior Mode</p>
              <p className="text-xs text-slate-500">Reduces clutter with larger touch targets and plain labels</p>
            </div>
            <input
              type="checkbox"
              checked={simpleMode}
              onChange={(e) => setSimpleMode(e.target.checked)}
              className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
            />
          </div>
        </div>
      </Dialog>
    </header>
  );
};

export default TopBar;
