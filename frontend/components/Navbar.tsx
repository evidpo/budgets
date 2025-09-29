import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavbarProps {
  darkMode?: boolean;
 toggleDarkMode?: () => void;
 isMobileSidebarOpen?: boolean;
  toggleMobileSidebar?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ darkMode, toggleDarkMode, isMobileSidebarOpen, toggleMobileSidebar }) => {
  const pathname = usePathname();
  
  const navItems = [
    { name: 'Счета', path: '/accounts' },
    { name: 'Транзакции', path: '/transactions' },
    { name: 'Бюджеты', path: '/budgets' },
    { name: 'Категории', path: '/categories' },
    { name: 'Долги', path: '/debts' },
    { name: 'Правила', path: '/rules' },
    { name: 'Отчёты', path: '/reports' },
    { name: 'Импорт', path: '/import' },
  ];

  return (
    <>
      {/* Кнопка бургер-меню для мобильных устройств */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-[rgb(var(--surface))] text-[rgb(var(--text-primary))] shadow-lg"
        onClick={toggleMobileSidebar}
        aria-label={isMobileSidebarOpen ? "Закрыть меню" : "Открыть меню"}
      >
        {/* Иконка бургер-меню */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          {isMobileSidebarOpen ? (
            // Иконка "крестик" для закрытия
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </>
          ) : (
            // Иконка "гамбургер" для открытия
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </>
          )}
        </svg>
      </button>

      {/* Боковая панель навигации */}
      <nav
        className={`bg-[rgb(var(--surface))] text-[rgb(var(--text-primary))] w-64 min-h-screen p-4 flex flex-col transform transition-transform duration-300 ease-in-out z-40 fixed md:static
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className="mb-8">
          <h1 className="text-xl font-bold">Семейные финансы</h1>
        </div>
        
        <ul className="flex-1">
          {navItems.map((item) => (
            <li key={item.path} className="mb-2">
              <Link
                href={item.path}
                className={`block px-4 py-2 rounded transition-colors duration-200 ${
                  pathname === item.path
                    ? 'bg-[rgb(var(--primary))] text-white'
                    : 'text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--background))] hover:text-[rgb(var(--text-primary))]'
                }`}
                onClick={() => window.innerWidth < 768 && toggleMobileSidebar && toggleMobileSidebar()} // Закрыть меню на мобильных устройствах при клике
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
        
        <div className="mt-auto pt-4 border-t border-[rgb(var(--border))]">
          <button
            className="w-full px-4 py-2 bg-[rgb(var(--background))] hover:bg-[rgb(var(--surface))] rounded transition-colors duration-200 text-[rgb(var(--text-primary))]"
            onClick={toggleDarkMode}
          >
            {darkMode ? 'Светлая тема' : 'Темная тема'}
          </button>
        </div>
      </nav>

      {/* Overlay для мобильных устройств */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleMobileSidebar}
        ></div>
      )}
    </>
  );
};

export default Navbar;