import React from 'react';
import Layout from '../../components/Layout';
import { useRealtimeTransactions } from '@/hooks/useRealtimeSubscription';
import { TransactionFilter } from '@/lib/types';

export default function TransactionsPage({ darkMode, toggleDarkMode }: { darkMode?: boolean; toggleDarkMode?: () => void }) {
  // Используем фильтр для получения транзакций за текущий день
  const filter: TransactionFilter = { 
    from_date: new Date().toISOString().split('T')[0] 
  };
  
  const { data: transactions = [], isLoading, error } = useRealtimeTransactions({ filter });

  if (isLoading) {
    return (
      <Layout title="Транзакции" darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Финансовые транзакции</h2>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              Новая транзакция
            </button>
          </div>
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Загрузка транзакций...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Транзакции" darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-80 dark:text-white">Финансовые транзакции</h2>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              Новая транзакция
            </button>
          </div>
          <div className="text-center py-8">
            <p className="text-red-500">Ошибка загрузки транзакций: {error.message}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Транзакции" darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Финансовые транзакции</h2>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            Новая транзакция
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-20 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Дата</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Описание</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Категория</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Сумма</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{transaction.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{transaction.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{transaction.category_id || 'Без категории'}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${transaction.type === 'income' ? 'text-green-600 dark:text-green-40' : 'text-red-600 dark:text-red-400'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{Math.abs(transaction.amount).toFixed(2)} ₽
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                    Нет транзакций
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}