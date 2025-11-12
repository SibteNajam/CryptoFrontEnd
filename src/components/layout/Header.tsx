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
  
  // Get credentials for each exchange
  const binanceCredentials = useAppSelector(getCredentialsForExchange('binance'));
  const bitgetCredentials = useAppSelector(getCredentialsForExchange('bitget'));

  const [showExchangeDropdown, setShowExchangeDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [exchangeToSetup, setExchangeToSetup] = useState<ExchangeType>('binance');
  const { isDarkMode, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
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
    const credentials = exchangeId === 'binance' ? binanceCredentials : bitgetCredentials;
    
    if (credentials) {
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
  <header className="bg-card px-6 py-3 flex items-center justify-between">
      {/* Left side - Sidebar toggle + Title */}
      <div className="flex items-center space-x-4">
        <button onClick={onToggleSidebar} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <span className="sr-only">Toggle sidebar</span>
          ☰
        </button>
        <h1 className="text-base font-medium text-primary">Trading Dashboard</h1>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-md mx-8">
        <input
          type="text"
          placeholder="Search symbols, pairs..."
          className="w-full px-4 py-2 bg-muted rounded text-sm text-primary placeholder-text-muted focus:outline-none"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Exchange Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowExchangeDropdown((prev) => !prev)}
            className="flex items-center space-x-2 rounded px-3 py-1.5 hover:bg-muted transition-colors"
          >
            <Image
              src={exchangeLogos[selectedExchange]}
              alt={exchangeNames[selectedExchange]}
              width={20}
              height={20}
              className="rounded-sm"
            />
            <span className="text-sm font-medium text-primary">
              {exchangeNames[selectedExchange] || 'Select Exchange'}
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {showExchangeDropdown && (
            <div className="absolute right-0 mt-2 bg-card border border-default rounded-lg shadow-lg w-64 z-50">
              {Object.entries(exchangeNames).map(([id, name]) => {
                const exchangeId = id as ExchangeType;
                const hasCredentials = exchangeId === 'binance' ? !!binanceCredentials : !!bitgetCredentials;
                const isActive = selectedExchange === exchangeId;
                
                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between px-4 py-3 border-b border-default last:border-b-0 ${
                      isActive ? 'bg-primary/5' : 'hover:bg-muted'
                    } transition-colors`}
                  >
                    {/* Left side - Exchange info (clickable) */}
                    <button
                      onClick={() => handleExchangeClick(exchangeId)}
                      className="flex items-center space-x-3 flex-1 text-left"
                    >
                      <Image 
                        src={exchangeLogos[id]} 
                        alt={name} 
                        width={24} 
                        height={24} 
                        className="rounded-sm" 
                      />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>
                            {name}
                          </span>
                          {isActive && (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {hasCredentials ? 'Configured' : 'Not configured'}
                        </span>
                      </div>
                    </button>
                    
                    {/* Right side - Setup/Update button */}
                    <button
                      onClick={(e) => handleSetupCredentials(exchangeId, e)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        hasCredentials
                          ? 'bg-muted hover:bg-muted/80 text-foreground'
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
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
          className="p-2 rounded hover:bg-muted transition-colors"
          title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? (
            <Sun size={18} className="text-primary" />
          ) : (
            <Moon size={18} className="text-muted-foreground" />
          )}
        </button>

        {/* Notification */}
        <button className="p-2 hover:bg-muted rounded relative transition-colors">
          🔔
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown((prev) => !prev)}
            className="flex items-center space-x-2 bg-muted px-3 py-2 rounded hover:bg-opacity-80 transition-colors"
          >
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-semibold text-gray-900">
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-primary">{user?.displayName || 'User'}</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 bg-card rounded shadow-lg w-48 z-50">
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-primary">{user?.displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 w-full px-4 py-2 hover:bg-muted text-left text-danger transition-colors"
              >
                <LogOut size={16} />
                <span className="text-sm">Logout</span>
              </button>
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
