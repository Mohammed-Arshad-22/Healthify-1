import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  FileText, 
  Clock, 
  Pill, 
  TrendingUp, 
  UserCheck, 
  Users, 
  QrCode, 
  ShieldAlert, 
  Sparkles, 
  Bell, 
  Settings,
  FolderHeart,
  Activity,
  Share2,
  X
} from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

export const Sidebar = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const navItems = [
    { to: '/', label: t('nav.home'), icon: <Home className="w-4 h-4" /> },
    { to: '/records', label: t('nav.records'), icon: <FolderHeart className="w-4 h-4" /> },
    { to: '/documents', label: t('nav.documents'), icon: <FileText className="w-4 h-4" /> },
    { to: '/timeline', label: t('nav.timeline'), icon: <Clock className="w-4 h-4" /> },
    { to: '/medicines', label: t('nav.medicines'), icon: <Pill className="w-4 h-4" /> },
    { to: '/trends', label: t('nav.trends'), icon: <TrendingUp className="w-4 h-4" /> },
    { to: '/laboratory', label: 'Lab Dashboard', icon: <Activity className="w-4 h-4 text-teal-600" /> },
    { to: '/doctors', label: t('nav.doctors'), icon: <UserCheck className="w-4 h-4" /> },
    { to: '/caregivers', label: t('nav.caregivers'), icon: <Users className="w-4 h-4" /> },
    { to: '/abha', label: t('nav.abha'), icon: <QrCode className="w-4 h-4" />, highlight: 'demo' },
    { to: '/emergency', label: t('nav.emergency'), icon: <ShieldAlert className="w-4 h-4 text-rose-500" /> },
    { to: '/copilot', label: t('nav.copilot'), icon: <Sparkles className="w-4 h-4 text-teal-600" />, badge: 'AI' },
    { to: '/notifications', label: t('nav.notifications'), icon: <Bell className="w-4 h-4" /> },
    { to: '/settings', label: t('nav.settings'), icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200
          flex flex-col transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:h-[calc(100vh-4rem)]
          ${isOpen ? 'translate-x-0 shadow-elevated' : '-translate-x-full lg:shadow-none'}
        `}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 lg:hidden">
          <span className="font-bold text-slate-800 text-sm">Healthcare Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={({ isActive }) => `
                flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all
                ${isActive
                  ? 'bg-teal-50 text-teal-900 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0">{item.icon}</span>
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded-md">
                  {item.badge}
                </span>
              )}
              {item.highlight === 'demo' && (
                <span className="text-[9px] bg-cyan-100 text-cyan-800 font-semibold px-1 py-0.5 rounded">
                  Gov ID
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Copilot Assistant Quick Helper Banner */}
        <div className="p-3 m-3 rounded-2xl bg-gradient-to-br from-teal-500/10 via-cyan-500/10 to-transparent border border-teal-200/50">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-semibold text-teal-900">Health Copilot</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed mb-2.5">
            Understand lab results, track medications & translate health records.
          </p>
          <NavLink
            to="/copilot"
            onClick={() => {
              if (window.innerWidth < 1024) onClose();
            }}
            className="block text-center text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 py-1.5 rounded-xl transition-colors shadow-xs"
          >
            Ask Copilot
          </NavLink>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
