import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
 action?: React.ReactNode;
 className?: string;
}

export default function Card({ 
  title, 
  children, 
  action, 
  className = '' 
}: CardProps) {
 return (
    <div className={`bg-[rgb(var(--background))] rounded-lg shadow border border-[rgb(var(--border))] overflow-hidden ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-[rgb(var(--border))] flex items-center justify-between">
          {title && <h3 className="text-lg font-medium text-[rgb(var(--text-primary))]">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
 );
}