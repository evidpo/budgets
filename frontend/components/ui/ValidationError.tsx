import React from 'react';
import { Badge } from './Badge';

interface ValidationErrorProps {
  errors?: string[];
  className?: string;
}

export const ValidationError: React.FC<ValidationErrorProps> = ({ errors, className = '' }) => {
  if (!errors || errors.length === 0) {
    return null;
  }

  return (
    <div className={`mt-1 ${className}`}>
      {errors.map((error, index) => (
        <Badge key={index} variant="error" className="mr-2 mb-1 text-xs">
          {error}
        </Badge>
      ))}
    </div>
  );
};