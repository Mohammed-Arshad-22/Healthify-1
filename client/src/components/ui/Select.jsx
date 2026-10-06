import React, { useId } from 'react';

export const Select = React.forwardRef(({
  label,
  options = [],
  error,
  helperText,
  id: explicitId,
  className = '',
  required = false,
  disabled = false,
  placeholder = 'Select an option',
  children,
  ...props
}, ref) => {
  const generatedId = useId();
  const selectId = explicitId || generatedId;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-xs font-semibold text-slate-700 tracking-wide uppercase"
        >
          {label}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      <select
        ref={ref}
        id={selectId}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        className={`
          block w-full rounded-xl border text-sm transition-colors duration-150
          bg-white text-slate-900 px-3.5 py-2.5 min-h-[44px]
          ${error
            ? 'border-rose-400 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
            : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'}
          ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''}
          ${className}
        `}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.length > 0
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>

      {error ? (
        <p className="text-xs text-rose-600 font-medium" role="alert">
          ⚠ {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';

export const Textarea = React.forwardRef(({
  label,
  error,
  helperText,
  id: explicitId,
  className = '',
  required = false,
  disabled = false,
  rows = 3,
  ...props
}, ref) => {
  const generatedId = useId();
  const textareaId = explicitId || generatedId;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-semibold text-slate-700 tracking-wide uppercase"
        >
          {label}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        className={`
          block w-full rounded-xl border text-sm transition-colors duration-150
          placeholder:text-slate-400 bg-white text-slate-900 p-3
          ${error
            ? 'border-rose-400 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
            : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-100'}
          ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' : ''}
          ${className}
        `}
        {...props}
      />

      {error ? (
        <p className="text-xs text-rose-600 font-medium" role="alert">
          ⚠ {error}
        </p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
});

Textarea.displayName = 'Textarea';
export default Select;
