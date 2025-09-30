/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Цвета для светлой темы
        light: {
          primary: '#3B82F6',
          'primary-hover': '#2563EB',
          secondary: '#6B7280',
          'secondary-hover': '#4B5563',
          success: '#10B981',
          'success-hover': '#059669',
          danger: '#EF4444',
          'danger-hover': '#DC2626',
          warning: '#F59E0B',
          'warning-hover': '#D97706',
          background: '#FFFFFF',
          surface: '#F9FAFB',
          text: {
            primary: '#1F2937',
            secondary: '#6B7280',
            muted: '#9CA3AF',
          },
          border: '#E5E7EB',
        },
        // Цвета для темной темы
        dark: {
          primary: '#60A5FA',
          'primary-hover': '#3B82F6',
          secondary: '#9CA3AF',
          'secondary-hover': '#D1D5DB',
          success: '#34D399',
          'success-hover': '#10B981',
          danger: '#F87171',
          'danger-hover': '#EF4444',
          warning: '#FBBF24',
          'warning-hover': '#F59E0B',
          background: '#111827',
          surface: '#1F2937',
          text: {
            primary: '#F9FAFB',
            secondary: '#D1D5DB',
            muted: '#9CA3AF',
          },
          border: '#374151',
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
    }
  },  // <-- ВОТ ЭТА СКОБКА ЗАКРЫВАЕТ theme
  plugins: [],  // <-- plugins СНАРУЖИ theme!
}