import React from 'react';

interface TransactionItemProps {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
 type: 'income' | 'expense';
}

export default function TransactionItem({ 
  description, 
  amount, 
  date, 
  category, 
 type 
}: TransactionItemProps) {
  return (
    <div className="border-b py-3 flex justify-between items-center">
      <div>
        <p className="font-medium">{description}</p>
        <p className="text-sm text-gray-500">{category} • {date}</p>
      </div>
      <span className={type === 'income' ? 'text-green-600' : 'text-red-600'}>
        {type === 'income' ? '+' : '-'}{amount.toFixed(2)} руб.
      </span>
    </div>
  );
}