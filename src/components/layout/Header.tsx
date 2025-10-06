'use client';

import React, { useState } from 'react';
import { ChevronDown, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/infrastructure/theme/ThemeContext';
import { useAppSelector, useAppDispatch } from '@/infrastructure/store/hooks';
import {
  ExchangeType,
  setSelectedExchange,
  toggleSetupModal,
} from '@/infrastructure/features/exchange/exchangeSlice';
import ExchangeSelector from './ExchangeSelector';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const dispatch = useAppDispatch();
  const { selectedExchange, exchanges, isSetupModalOpen } = useAppSelector(
    (state) => state.exchange
  );

  const [showExchangeDropdown, setShowExchangeDropdown] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const exchangeNames: Record<string, string> = {
    binance: 'Binance',
    bitget: 'Bitget',
  };

  const exchangeLogos: Record<string, string> = {
    binance: '/exchanges/binance.svg',
    bitget: '/exchanges/bitget.svg',
  };

  const handleExchangeClick = (exchangeId: string) => {
    dispatch(setSelectedExchange(exchangeId as ExchangeType));
    dispatch(toggleSetupModal());
    setShowExchangeDropdown(false);
  };

  return (
    <header className="bg-card border-b border-default px-6 py-3 flex items-center justify-between">
      {/* Left side - Sidebar toggle + Title */}
      <div className="flex items-center space-x-4">
        <button onClick={onToggleSidebar} className="p-2 hover:bg-muted rounded-lg">
          <span className="sr-only">Toggle sidebar</span>
          ☰
        </button>
        <h1 className="text-xl font-semibold text-primary">Trading Dashboard</h1>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-md mx-8">
        <input
          type="text"
          placeholder="Search symbols, pairs..."
          className="w-full px-4 py-2 bg-muted border border-light rounded-lg focus-ring"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-6">
        {/* Exchange Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExchangeDropdown((prev) => !prev)}
            className="flex items-center space-x-2 border border-default rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
          >
            <img
              src={exchangeLogos[selectedExchange]}
              alt={exchangeNames[selectedExchange]}
              className="w-5 h-5"
            />
            <span className="font-medium">
              {exchangeNames[selectedExchange] || 'Select Exchange'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showExchangeDropdown && (
            <div className="absolute right-0 mt-2 bg-card border border-default rounded-lg shadow-lg w-40 z-50">
              {Object.entries(exchangeNames).map(([id, name]) => (
                <button
                  key={id}
                  onClick={() => handleExchangeClick(id)}
                  className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-muted text-left"
                >
                  <img src={exchangeLogos[id]} alt={name} className="w-5 h-5" />
                  <span>{name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-muted transition-colors duration-300"
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? (
            <Sun size={20} className="text-primary" />
          ) : (
            <Moon size={20} className="text-muted-foreground" />
          )}
        </button>

        {/* Notification */}
        <button className="p-2 hover:bg-muted rounded-lg relative">
          🔔
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-primary rounded-full"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center space-x-2 bg-muted px-3 py-2 rounded-lg">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
            S
          </div>
          <span className="font-medium">SibteNajam</span>
        </div>
      </div>

      {/* Exchange Setup Modal */}
      {isSetupModalOpen && <ExchangeSelector />}
    </header>
  );
}
