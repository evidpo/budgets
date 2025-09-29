import React from 'react';
import Icon from './Icon';

interface CategoryTagProps {
  name: string;
  color?: string;
  icon?: string;
  className?: string;
}

export default function CategoryTag({ 
  name, 
  color = '#3B82F6', // blue-500 по умолчанию
  icon = 'plus',
  className = '' 
}: CategoryTagProps) {
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ backgroundColor: `${color}20`, borderColor: color }} // 20% opacity для фона
    >
      <Icon name={icon} size="sm" className="mr-1" style={{ color }} />
      {name}
    </span>
  );
}