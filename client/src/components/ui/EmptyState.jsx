import React from 'react';
import { Button } from './Button';

export const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`
        text-center py-12 px-4 sm:px-6 rounded-2xl border-2 border-dashed border-slate-200
        bg-slate-50/50 flex flex-col items-center justify-center max-w-xl mx-auto
        ${className}
      `}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-4 shadow-xs">
          {icon}
        </div>
      )}

      <h3 className="text-base sm:text-lg font-semibold text-slate-800">{title}</h3>
      
      {description && (
        <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-sm leading-relaxed">
          {description}
        </p>
      )}

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && (
            <Button size="md" variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && (
            <Button size="md" variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
