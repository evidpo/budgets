import React from 'react';
import Layout from '../../components/Layout';

export default function ReportsPage({ darkMode, toggleDarkMode }: { darkMode?: boolean; toggleDarkMode?: () => void }) {
  return (
    <Layout title="Отчёты" darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Финансовые отчёты</h2>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            Создать отчёт
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 dark:text-white mb-2">Доходы vs Расходы</h3>
            <div className="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
              <span className="text-gray-500 dark:text-gray-300">График доходов и расходов</span>
            </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 dark:text-white mb-2">Распределение по категориям</h3>
            <div className="h-64 flex items-center justify-center bg-gray-10 dark:bg-gray-700 rounded">
              <span className="text-gray-500 dark:text-gray-300">Круговая диаграмма категорий</span>
            </div>
          </div>
        </div>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 dark:text-white mb-2">Сводка за месяц</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">+45 000 ₽</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Доходы</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">-28 500 ₽</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">Расходы</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-60 dark:text-blue-400">+16 500 ₽</p>
              <p className="text-sm text-gray-600 dark:text-gray-30">Остаток</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}