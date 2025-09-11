'use client';

import React from 'react';
import { Menu, Search, Bell, Settings, User, RefreshCw, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../infrastructure/theme/ThemeContext'; // ✅ Add this import

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  // ✅ Replace the useState and useEffect with theme context
  const { isDarkMode, toggleTheme } = useTheme();

  // ✅ Remove the old useState and useEffect - everything else stays the same!

  return (
    <header className="h-16 bg-card border-b border-default shadow-sm">
      <div className="h-full flex items-center justify-between px-6">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover-accent transition-colors lg:hidden"
          >
            <Menu size={20} className="text-muted-foreground" />
          </button>
          
          <div className="hidden md:flex items-center space-x-2">
            <h1 className="text-xl font-bold text-primary">
              Trading Dashboard
            </h1>
            <div className="flex items-center space-x-1 px-2 py-1 bg-success-light rounded-full">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-xs font-medium text-success">Live</span>
            </div>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search symbols, pairs..."
              className="w-full pl-10 pr-4 py-2 bg-input border border-input focus-ring rounded-lg text-card-foreground placeholder:text-muted"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Market Status */}
          <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-muted rounded-lg">
            <RefreshCw size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-secondary">
              Market Open
            </span>
          </div>

          {/* Theme Toggle Button - stays exactly the same */}
          <button 
            onClick={toggleTheme} // ✅ Now uses context function
            className="p-2 rounded-lg hover-accent transition-colors duration-300 relative group"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <Sun size={20} className="text-warning" />
            ) : (
              <Moon size={20} className="text-muted-foreground" />
            )}
          </button>

          {/* Notifications */}
          <button className="p-2 rounded-lg hover-accent transition-colors relative">
            <Bell size={20} className="text-muted-foreground" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-danger rounded-full"></span>
          </button>

          {/* Settings */}
          <button className="p-2 rounded-lg hover-accent transition-colors">
            <Settings size={20} className="text-muted-foreground" />
          </button>

          {/* User Menu */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover-accent transition-colors cursor-pointer">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <User size={16} className="text-primary-foreground" />
            </div>
            <span className="hidden sm:block text-sm font-medium text-secondary">
              SibteNajam
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}