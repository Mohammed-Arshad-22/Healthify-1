import React from 'react';

export const Tabs = ({ tabs = [], activeTab, onChange, className = '' }) => {
  return (
    <div className={`border-b border-slate-200 ${className}`} role="tablist">
      <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto scrollbar-none py-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`
                whitespace-nowrap py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium
                transition-all duration-150 flex items-center gap-2 select-none
                ${isActive
                  ? 'bg-teal-50 text-teal-800 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}
              `}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`
                    text-[10px] px-1.5 py-0.5 rounded-full font-bold
                    ${isActive ? 'bg-teal-200 text-teal-900' : 'bg-slate-200 text-slate-700'}
                  `}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Tabs;
