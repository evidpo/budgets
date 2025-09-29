import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Amount } from '../ui/Amount';
import { Icon } from '../ui/Icon';
import { Account } from '@/lib/types';

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
}

const getAccountIcon = (type: string) => {
  switch (type) {
    case 'cash':
      return '💰';
    case 'checking':
      return '💳';
    case 'savings':
      return '🏦';
    case 'credit_card':
      return '신용카드';
    case 'investment':
      return '📈';
    case 'card':
      return '💳';
    case 'credit':
      return '💳';
    default:
      return '💰';
  }
};

export default function AccountCard({ account, onClick }: AccountCardProps) {
  const icon = getAccountIcon(account.type);
  
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${onClick ? 'hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium text-gray-900 dark:text-white truncate">
            {account.name}
          </CardTitle>
          <span className="text-2xl">{icon}</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
          {account.type.replace('_', ' ')}
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <Amount 
            value={account.balance} 
            currency={account.currency} 
            className="text-lg font-semibold"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {account.currency}
          </span>
        </div>
        {account.note && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
            {account.note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}