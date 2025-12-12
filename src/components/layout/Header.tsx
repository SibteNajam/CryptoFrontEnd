"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import binanceImg from '../../../images/binance.jpeg';
import bitgetImg from '../../../images/bitget.png';
import { ChevronDown, Moon, Sun, LogOut, Settings, CheckCircle2 } from 'lucide-react';
import { useTheme } from '@/infrastructure/theme/ThemeContext';
import { useAppSelector, useAppDispatch } from '@/infrastructure/store/hooks';
import { useAuth } from '@/hooks/auth';
import {
  ExchangeType,
  setSelectedExchange,
  getCredentialsForExchange,
  clearCredentials,
} from '@/infrastructure/features/exchange/exchangeSlice';
import ExchangeSelector from './ExchangeSelector';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { logout, user } = useAuth();
  const selectedExchange = useAppSelector((state) => state.exchange.selectedExchange);

  // Get configured exchanges from user auth state instead of Redux credentials
  const configuredExchanges = user?.configuredExchanges || [];

  console.log('🔄 Header - configured exchanges:', configuredExchanges);
  console.log('🔄 Header - user object:', user);

  const [showExchangeDropdown, setShowExchangeDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [exchangeToSetup, setExchangeToSetup] = useState<ExchangeType>('binance');
  const { isDarkMode, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      // Clear exchange credentials from Redux
      dispatch(clearCredentials());

      // Call logout (clears tokens and localStorage caches)
      await logout();

      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const exchangeNames: Record<string, string> = {
    binance: 'Binance',
    bitget: 'Bitget',
  };

  const exchangeLogos: Record<string, any> = {
    binance: binanceImg,
    bitget: bitgetImg,
  };

  // Handle clicking on exchange name - switches exchange if credentials exist
  const handleExchangeClick = (exchangeId: ExchangeType) => {
    const hasCredentials = configuredExchanges.some(
      exchange => exchange.toLowerCase() === exchangeId.toLowerCase()
    );

    if (hasCredentials) {
      // Has credentials, switch to this exchange
      dispatch(setSelectedExchange(exchangeId));
      setShowExchangeDropdown(false);
    } else {
      // No credentials, open setup modal
      setExchangeToSetup(exchangeId);
      dispatch(setSelectedExchange(exchangeId));
      setIsSetupModalOpen(true);
      setShowExchangeDropdown(false);
    }
  };

  // Handle clicking on Set/Update button
  const handleSetupCredentials = (exchangeId: ExchangeType, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering handleExchangeClick
    setExchangeToSetup(exchangeId);
    dispatch(setSelectedExchange(exchangeId));
    setIsSetupModalOpen(true);
    setShowExchangeDropdown(false);
  };

  return (
    <header className="bg-card px-6 py-2 flex items-center justify-between border-b border-default">
      {/* Left side - empty (reserved for future controls) */}
      <div className="flex items-center space-x-3" />

      {/* Right side */}
      <div className="flex items-center space-x-1">
        <div className="relative">
          <button
            onClick={() => setShowExchangeDropdown((prev) => !prev)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/50 hover:bg-muted border border-default transition-all duration-200 group"
          >
            <Image
              src={exchangeLogos[selectedExchange]}
              alt={exchangeNames[selectedExchange]}
              width={20}
              height={20}
              className="rounded-sm"
            />
            <span className="text-xs font-semibold text-primary hidden sm:inline">
              {exchangeNames[selectedExchange] || 'Select Exchange'}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>

          {showExchangeDropdown && (
            <div className="absolute right-0 mt-1 bg-card border border-default rounded-lg shadow-lg w-60 z-50">
              {Object.entries(exchangeNames).map(([id, name]) => {
                const exchangeId = id as ExchangeType;
                const hasCredentials = configuredExchanges.some(
                  exchange => exchange.toLowerCase() === id.toLowerCase()
                );
                const isActive = selectedExchange === exchangeId;

                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between px-3 py-2.5 border-b border-default last:border-b-0 ${isActive ? 'bg-primary/5' : 'hover:bg-muted/50'
                      } transition-colors`}
                  >
                    {/* Left side - Exchange info (clickable) */}
                    <button
                      onClick={() => handleExchangeClick(exchangeId)}
                      className="flex items-center gap-2.5 flex-1 text-left"
                    >
                      <Image
                        src={exchangeLogos[id]}
                        alt={name}
                        width={24}
                        height={24}
                        className="rounded-sm"
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {name}
                          </span>
                          {isActive && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground mt-0.5">
                          {hasCredentials ? 'Configured' : 'Not configured'}
                        </span>
                      </div>
                    </button>

                    {/* Right side - Setup/Update button */}
                    <button
                      onClick={(e) => handleSetupCredentials(exchangeId, e)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all duration-200 ${hasCredentials
                        ? 'bg-muted hover:bg-muted/80 text-foreground border border-default'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground border border-primary'
                        }`}
                    >
                      <Settings className="w-3 h-3" />
                      {hasCredentials ? 'Update' : 'Setup'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg hover:bg-muted border border-default transition-all duration-200 text-primary hover:text-primary-foreground group"
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? (
            <Sun size={16} className="group-hover:rotate-90 transition-transform duration-300" />
          ) : (
            <Moon size={16} className="group-hover:-rotate-90 transition-transform duration-300" />
          )}
        </button>

        {/* Notification */}
        <button className="p-1.5 rounded-lg hover:bg-muted border border-default relative transition-all duration-200 text-primary hover:text-primary-foreground group" title="Notifications">
          <span className="text-lg">🔔</span>
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-danger rounded-full animate-pulse"></span>
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown((prev) => !prev)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/50 hover:bg-muted border border-default transition-all duration-200 group"
          >
            <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center text-xs font-semibold text-primary border border-primary/30 group-hover:bg-primary/30 transition-colors">
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-xs font-semibold text-primary hidden sm:inline max-w-[80px] truncate">{user?.displayName || 'User'}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-1 bg-card rounded-lg shadow-lg w-48 z-50 border border-default overflow-hidden">
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-primary">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="border-t border-default">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-muted text-left text-danger transition-colors text-xs font-medium"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exchange Setup Modal */}
      {isSetupModalOpen && (
        <ExchangeSelector
          isOpen={isSetupModalOpen}
          onClose={() => setIsSetupModalOpen(false)}
          exchangeToSetup={exchangeToSetup}
        />
      )}
    </header>
  );
}
