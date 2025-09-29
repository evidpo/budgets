import React from 'react';

interface BudgetItemProps {
  category: string;
  allocated: number;
  spent: number;
}

export default function BudgetItem({ category, allocated, spent }: BudgetItemProps) {
  const percentage = (spent / allocated) * 100;
  
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between mb-2">
        <span className="font-medium">{category}</span>
        <span>{spent.toFixed(2)} из {allocated.toFixed(2)} руб.</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${
            percentage > 100 ? 'bg-red-500' : 'bg-green-500'
          }`} 
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      <div className="text-right text-sm text-gray-500 mt-1">
        {percentage.toFixed(1)}%
      </div>
    </div>
  );
}