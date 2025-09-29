import React from 'react';

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  className?: string;
}

export default function ProgressBar({ value, label, className = '' }: ProgressBarProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{label}</span>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{value}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div 
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
}