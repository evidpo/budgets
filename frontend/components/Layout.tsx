import React, { useState } from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
 title?: string;
  darkMode?: boolean;
  toggleDarkMode?: () => void;
}

const Layout = ({ children, title, darkMode, toggleDarkMode }: LayoutProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-[rgb(var(--background))]">
      <Navbar
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        isMobileSidebarOpen={isMobileSidebarOpen}
        toggleMobileSidebar={toggleMobileSidebar}
      />
      <main className={`flex-1 p-6 ${isMobileSidebarOpen ? 'hidden md:block' : ''}`}>
        {title && <h1 className="text-2xl font-bold mb-6 text-[rgb(var(--text-primary))]">{title}</h1>}
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;