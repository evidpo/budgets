import React, { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

export default function Select({
  label,
  error,
  helperText,
  options,
  className = '',
  ...props
}: SelectProps) {
  const selectClasses = `w-full px-3 py-2 border rounded-md shadow-sm
    focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] focus:border-[rgb(var(--primary))]
    bg-[rgb(var(--background))] border-[rgb(var(--border))] text-[rgb(var(--text-primary))]
    ${error ? 'border-[rgb(var(--danger))]' : 'border-[rgb(var(--border))]'}`;
  
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[rgb(var(--text-primary))] mb-1">
          {label}
        </label>
      )}
      <select
        {...props}
        className={`${selectClasses} ${className}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helperText && !error && (
        <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">{helperText}</p>
      )}
      {error && (
        <p className="mt-1 text-sm text-[rgb(var(--danger))]">{error}</p>
      )}
    </div>
  );
}