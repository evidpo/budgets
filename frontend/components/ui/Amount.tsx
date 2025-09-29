import React from 'react';

interface AmountProps {
  value: number;
  currency?: string;
  positiveColor?: 'text-green-600' | 'text-blue-600' | 'text-indigo-600';
  negativeColor?: 'text-red-600' | 'text-orange-600' | 'text-pink-600';
  className?: string;
}

export default function Amount({ 
  value, 
  currency = 'EUR', 
 positiveColor = 'text-green-600',
  negativeColor = 'text-red-600',
  className = '' 
}: AmountProps) {
  const isPositive = value >= 0;
  const formattedValue = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  
  const color = isPositive ? positiveColor : negativeColor;
  const sign = isPositive ? '+' : '-';

  return (
    <span className={`font-mono ${color} ${className}`}>
      {sign}{formattedValue} {currency}
    </span>
  );
}