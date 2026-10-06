import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Clock, Pill, User, Plus, FileUp, Sparkles, FolderPlus } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';
import { BottomSheet } from '../ui/BottomSheet';

export const BottomNav = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showQuickAction, setShowQuickAction] = useState(false);

  const mainTabs = [
    { to: '/', label: t('nav.home'), icon: <Home className="w-5 h-5" /> },
    { to: '/timeline', label: t('nav.timeline'), icon: <Clock className="w-5 h-5" /> },
    // Center floating slot
    { to: '/medicines', label: t('nav.medicines'), icon: <Pill className="w-5 h-5" /> },
    { to: '/profile', label: t('nav.profile'), icon: <User className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="
          lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md
          border-t border-slate-200 px-3 py-1 shadow-lg
        "
        aria-label="Mobile Navigation"
      >
        <div className="flex items-center justify-around relative max-w-md mx-auto">
          {/* Tab 1: Home */}
          <NavLink
            to="/"
            className={({ isActive }) => `
              flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-colors
              ${isActive ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'}
            `}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>{t('nav.home')}</span>
          </NavLink>

          {/* Tab 2: Timeline */}
          <NavLink
            to="/timeline"
            className={({ isActive }) => `
              flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-colors
              ${isActive ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'}
            `}
          >
            <Clock className="w-5 h-5 mb-0.5" />
            <span>{t('nav.timeline')}</span>
          </NavLink>

          {/* Floating Center Action Button */}
          <div className="relative -top-4 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setShowQuickAction(true)}
              className="
                w-12 h-12 rounded-full bg-gradient-to-tr from-teal-600 to-cyan-500
                text-white flex items-center justify-center shadow-lg active:scale-95
                focus:outline-none focus:ring-4 focus:ring-teal-100 transition-transform
              "
              aria-label="Quick Action: Upload or Add Record"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </div>

          {/* Tab 3: Medicines */}
          <NavLink
            to="/medicines"
            className={({ isActive }) => `
              flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-colors
              ${isActive ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'}
            `}
          >
            <Pill className="w-5 h-5 mb-0.5" />
            <span>{t('nav.medicines')}</span>
          </NavLink>

          {/* Tab 4: Profile */}
          <NavLink
            to="/profile"
            className={({ isActive }) => `
              flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-colors
              ${isActive ? 'text-teal-600' : 'text-slate-500 hover:text-slate-800'}
            `}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span>{t('nav.profile')}</span>
          </NavLink>
        </div>
      </nav>

      {/* Floating Action Modal / Bottom Sheet */}
      <BottomSheet
        isOpen={showQuickAction}
        onClose={() => setShowQuickAction(false)}
        title="Quick Healthcare Actions"
      >
        <div className="grid grid-cols-1 gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              setShowQuickAction(false);
              navigate('/documents?action=upload');
            }}
            className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-teal-50/50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Upload Prescription or Report</p>
              <p className="text-xs text-slate-500">Scan photo, camera snap, or upload PDF</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowQuickAction(false);
              navigate('/medicines?action=add');
            }}
            className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-teal-50/50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center flex-shrink-0">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Add Medication</p>
              <p className="text-xs text-slate-500">Set dosage, frequency & daily reminders</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowQuickAction(false);
              navigate('/records?action=new');
            }}
            className="flex items-center gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-teal-50/50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Add Health Record</p>
              <p className="text-xs text-slate-500">Doctor visit, vaccination, or diagnostic summary</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowQuickAction(false);
              navigate('/copilot');
            }}
            className="flex items-center gap-3.5 p-3.5 rounded-xl border border-teal-200 bg-teal-50/50 hover:bg-teal-100/50 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-teal-900">Ask Health Copilot</p>
              <p className="text-xs text-teal-700">Get AI plain-language explanations of your records</p>
            </div>
          </button>
        </div>
      </BottomSheet>
    </>
  );
};

export default BottomNav;
