import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
 variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  className?: string;
}

export default function Button({
  children,
  onClick,
  variant = 'primary',
  className = ''
}: ButtonProps) {
  const baseClasses = 'px-4 py-2 rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[40px] w-full sm:w-auto';
  const variantClasses = {
    primary: 'bg-[rgb(var(--primary))] text-white hover:bg-[rgb(var(--primary-hover))] dark:bg-[rgb(var(--primary))] dark:hover:bg-[rgb(var(--primary-hover))]',
    secondary: 'bg-[rgb(var(--secondary))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--secondary-hover))] dark:bg-[rgb(var(--secondary))] dark:hover:bg-[rgb(var(--secondary-hover))]',
    danger: 'bg-[rgb(var(--danger))] text-white hover:bg-[rgb(var(--danger-hover))] dark:bg-[rgb(var(--danger))] dark:hover:bg-[rgb(var(--danger-hover))]',
    outline: 'border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--surface))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--text-secondary))] dark:hover:bg-[rgb(var(--surface))]',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}