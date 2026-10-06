import React, { useState, useRef, useEffect } from 'react';

export const Dropdown = ({
  trigger,
  children,
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {isOpen && (
        <div
          className={`
            absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-56
            rounded-2xl bg-white shadow-elevated border border-slate-200
            py-1.5 z-40 focus:outline-none animate-in fade-in zoom-in-95 duration-100
          `}
          role="menu"
          aria-orientation="vertical"
        >
          <div onClick={() => setIsOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
};

export const DropdownItem = ({ children, onClick, danger = false, icon = null }) => (
  <button
    type="button"
    onClick={onClick}
    className={`
      w-full text-left px-4 py-2.5 text-xs sm:text-sm font-medium flex items-center gap-2.5 transition-colors
      ${danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}
    `}
    role="menuitem"
  >
    {icon && <span className="w-4 h-4 text-slate-400">{icon}</span>}
    <span>{children}</span>
  </button>
);

export default Dropdown;
