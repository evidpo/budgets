import React from 'react';
import Layout from '../components/Layout';

export default function HomePage({ darkMode, toggleDarkMode }: { darkMode?: boolean; toggleDarkMode?: () => void }) {
  return (
    <Layout title="Главная" darkMode={darkMode} toggleDarkMode={toggleDarkMode}>
      <div className="bg-[rgb(var(--background))] rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-[rgb(var(--text-primary))]">Добро пожаловать в приложение управления семейными финансами</h2>
        <p className="text-[rgb(var(--text-secondary))] mb-4">
          Это приложение поможет вам отслеживать ваши счета, транзакции, бюджеты и другие финансовые аспекты семьи.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-[rgb(var(--surface))] p-4 rounded">
            <h3 className="font-medium text-[rgb(var(--text-primary))]">Счета</h3>
            <p className="text-sm text-[rgb(var(--text-secondary))]">Управляйте своими банковскими счетами</p>
          </div>
          <div className="bg-[rgb(var(--surface))] p-4 rounded">
            <h3 className="font-medium text-[rgb(var(--text-primary))]">Транзакции</h3>
            <p className="text-sm text-[rgb(var(--text-secondary))]">Отслеживайте все ваши транзакции</p>
          </div>
          <div className="bg-[rgb(var(--surface))] p-4 rounded">
            <h3 className="font-medium text-[rgb(var(--text-primary))]">Бюджеты</h3>
            <p className="text-sm text-[rgb(var(--text-secondary))]">Планируйте и контролируйте свои бюджеты</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}