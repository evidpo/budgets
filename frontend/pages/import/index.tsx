import React from 'react';
import Layout from '../../components/Layout';

export default function ImportPage({ darkMode, toggleDarkMode }: { darkMode?: boolean; toggleDarkMode?: () => void }) {
  return (
    <Layout title="Импорт" darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">Импорт финансовых данных</h2>
        <div className="space-y-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="font-medium text-gray-800 dark:text-white mb-4">Импорт из CSV</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Загрузите CSV-файл с транзакциями для импорта в систему</p>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="csv-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.6 5.6 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                  </svg>
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Нажмите для загрузки</span> или перетащите файл сюда</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">CSV (MAX. 10MB)</p>
                </div>
                <input id="csv-upload" type="file" className="hidden" accept=".csv" />
              </label>
            </div>
            <button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              Начать импорт
            </button>
          </div>
          
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <h3 className="font-medium text-gray-800 dark:text-white mb-4">Поддерживаемые форматы</h3>
            <ul className="list-disc pl-5 text-gray-600 dark:text-gray-300 space-y-2">
              <li>CSV (с заголовками: дата, описание, сумма, категория)</li>
              <li>Excel (XLS, XLSX)</li>
              <li>QIF (Quicken Interchange Format)</li>
              <li>OFX (Open Financial Exchange)</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}