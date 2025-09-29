import React from 'react';
import Layout from '../../components/Layout';

export default function AccountsPage({ darkMode, toggleDarkMode }: { darkMode?: boolean; toggleDarkMode?: () => void }) {
  return (
    <Layout title="Счета" darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Банковские счета</h2>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            Новый счёт
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-blue-50 dark:bg-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white">Текущий счёт</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Сбербанк</p>
              </div>
              <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                Активен
              </span>
            </div>
            <p className="text-2xl font-bold mt-4 text-gray-800 dark:text-white font-mono">125 430 ₽</p>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              <p>Номер: **** 4567</p>
              <p>Владелец: Иванов И.И.</p>
            </div>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-green-50 dark:bg-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white">Карта</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Тинькофф</p>
              </div>
              <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-80 dark:text-green-100">
                Активен
              </span>
            </div>
            <p className="text-2xl font-bold mt-4 text-gray-800 dark:text-white font-mono">45 200 ₽</p>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              <p>Номер: **** 8901</p>
              <p>Владелец: Иванов И.И.</p>
            </div>
          </div>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-yellow-50 dark:bg-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-800 dark:text-white">Накопительный</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">ВТБ</p>
              </div>
              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100">
                Заморожен
              </span>
            </div>
            <p className="text-2xl font-bold mt-4 text-gray-800 dark:text-white font-mono">230 000 ₽</p>
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
              <p>Номер: **** 2345</p>
              <p>Владелец: Иванов И.И.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}