/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Используем класс для управления темной темой
  theme: {
    extend: {
      colors: {
        // Цвета для светлой темы
        light: {
          primary: '#3B82F6', // blue-500
          'primary-hover': '#2563EB', // blue-600
          secondary: '#6B7280', // gray-500
          'secondary-hover': '#4B5563', // gray-600
          success: '#10B981', // emerald-50
          'success-hover': '#059669', // emerald-600
          danger: '#EF4444', // red-500
          'danger-hover': '#DC2626', // red-600
          warning: '#F59E0B', // amber-500
          'warning-hover': '#D97706', // amber-600
          background: '#FFFFFF',
          surface: '#F9FAFB', // gray-50
          text: {
            primary: '#1F2937', // gray-800
            secondary: '#6B7280', // gray-500
            muted: '#9CA3AF', // gray-400
          },
          border: '#E5E7EB', // gray-200
        },
        // Цвета для темной темы
        dark: {
          primary: '#60A5FA', // blue-400
          'primary-hover': '#3B82F6', // blue-500
          secondary: '#9CA3AF', // gray-400
          'secondary-hover': '#D1D5DB', // gray-300
          success: '#34D399', // emerald-400
          'success-hover': '#10B981', // emerald-500
          danger: '#F87171', // red-400
          'danger-hover': '#EF4444', // red-500
          warning: '#FBBF24', // amber-400
          'warning-hover': '#F59E0B', // amber-500
          background: '#111827', // gray-900
          surface: '#1F2937', // gray-800
          text: {
            primary: '#F9FAFB', // gray-50
            secondary: '#D1D5DB', // gray-300
            muted: '#9CA3AF', // gray-400
          },
          border: '#374151', // gray-700
        }
      },
      transitionProperty: {
        'colors': 'background-color, border-color, color, fill, stroke',
      },
      transitionDuration: {
        '300': '300ms',
      },
      transitionTimingFunction: {
        'ease': 'ease',
      }
    },
  plugins: [],
}