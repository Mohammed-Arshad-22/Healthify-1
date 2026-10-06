import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Breadcrumbs = ({ items = [] }) => {
  return (
    <nav className="flex items-center text-xs font-medium text-slate-500 mb-4" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1.5 flex-wrap">
        <li>
          <Link to="/" className="text-slate-400 hover:text-teal-600 transition-colors flex items-center">
            <Home className="w-3.5 h-3.5" />
            <span className="sr-only">Home</span>
          </Link>
        </li>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center space-x-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
              {isLast || !item.to ? (
                <span className="text-slate-800 font-semibold" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="hover:text-teal-600 transition-colors">
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
