import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message = 'Loading health records...', className = '' }) => {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-teal-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
      </div>
      <p className="mt-4 text-xs sm:text-sm font-medium text-slate-500 animate-pulse">
        {message}
      </p>
    </div>
  );
};

export const SkeletonLoader = ({ count = 3, type = 'card' }) => {
  if (type === 'timeline') {
    return (
      <div className="space-y-6 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/4" />
              <div className="h-16 bg-slate-100 rounded-xl w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-14 bg-slate-100 rounded-xl w-full border border-slate-200/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-5 bg-slate-100 rounded-full w-16" />
          </div>
          <div className="h-3 bg-slate-100 rounded w-2/3" />
          <div className="h-8 bg-slate-50 rounded-lg w-full mt-4" />
        </div>
      ))}
    </div>
  );
};

export default LoadingState;
