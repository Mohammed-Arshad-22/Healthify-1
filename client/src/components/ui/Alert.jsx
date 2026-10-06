import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const Alert = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
  ...props
}) => {
  const styles = {
    info: {
      container: 'bg-cyan-50 border-cyan-200 text-cyan-900',
      icon: <Info className="w-5 h-5 text-cyan-600 flex-shrink-0" aria-hidden="true" />,
      tag: 'Information',
    },
    success: {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" aria-hidden="true" />,
      tag: 'Success',
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" aria-hidden="true" />,
      tag: 'Notice',
    },
    danger: {
      container: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" aria-hidden="true" />,
      tag: 'Alert',
    },
  };

  const current = styles[variant] || styles.info;

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 p-4 rounded-xl border transition-all duration-150
        ${current.container}
        ${className}
      `}
      {...props}
    >
      <div className="pt-0.5">{current.icon}</div>

      <div className="flex-1 text-sm">
        {title && (
          <div className="font-semibold mb-0.5 flex items-center gap-2">
            <span>{title}</span>
          </div>
        )}
        <div className="text-xs sm:text-sm leading-relaxed opacity-95">{children}</div>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;
