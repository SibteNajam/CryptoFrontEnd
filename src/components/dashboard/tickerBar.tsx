'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Volume2,
  Activity,
  Clock,
  Wifi,
  WifiOff,
  Loader2
} from 'lucide-react';

interface TickerBarProps {
  selectedSymbol: string;
  tickerData: any;
  userBalance?: {
    free: string;
    locked: string;
  };
  wsConnected?: boolean;
  isLoading?: boolean;
}

export default function TickerBar({ 
  selectedSymbol, 
  tickerData,
  userBalance,
  wsConnected = false,
  isLoading = false
}: TickerBarProps) {
  
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | 'none'>('none');

  // Loading state
  if (isLoading || !tickerData) {
    return (
      <div className="bg-card border-b border-gray-200">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="animate-pulse flex items-center space-x-2">
                <div className="h-5 bg-gray-200 rounded w-16"></div>
                <div className="h-5 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-14"></div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {wsConnected ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="h-3 w-3" />
                  <span className="text-xs">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <WifiOff className="h-3 w-3" />
                  <span className="text-xs">Disconnected</span>
                </div>
              )}
              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
            </div>
          </div>
          <div className="animate-pulse grid grid-cols-4 gap-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const currentPrice = parseFloat(tickerData.ticker.lastPrice);
  const priceChange = parseFloat(tickerData.ticker.priceChange);
  const priceChangePercent = parseFloat(tickerData.ticker.priceChangePercent);
  const highPrice = parseFloat(tickerData.ticker.highPrice);
  const lowPrice = parseFloat(tickerData.ticker.lowPrice);
  const volume = parseFloat(tickerData.ticker.volume);
  const quoteVolume = parseFloat(tickerData.ticker.quoteVolume);
  const openPrice = parseFloat(tickerData.ticker.openPrice);
  const bidPrice = parseFloat(tickerData.ticker.bidPrice);
  const askPrice = parseFloat(tickerData.ticker.askPrice);
  const tradeCount = tickerData.ticker.count;

  // Track price changes for real-time color updates
  useEffect(() => {
    if (previousPrice !== null && currentPrice !== previousPrice) {
      if (currentPrice > previousPrice) {
        setPriceFlash('up');
      } else if (currentPrice < previousPrice) {
        setPriceFlash('down');
      }
      
      // Reset flash after animation
      const timer = setTimeout(() => setPriceFlash('none'), 500);
      return () => clearTimeout(timer);
    }
    setPreviousPrice(currentPrice);
  }, [currentPrice, previousPrice]);

  // Determine price color based on comparison with opening price
  const getPriceColor = () => {
    if (currentPrice > openPrice) {
      return 'text-green-500';
    } else if (currentPrice < openPrice) {
      return 'text-red-500';
    } else {
      return 'text-blue-500';
    }
  };

  // Get flash background color
  const getFlashClass = () => {
    switch (priceFlash) {
      case 'up':
        return 'text-green-100';
      case 'down':
        return 'text-red-100';
      default:
        return '';
    }
  };

  const isPositive = priceChange >= 0;
  const baseAsset = selectedSymbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '');
  
  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (price >= 1) {
      return price.toFixed(4);
    }
    return price.toFixed(8);
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000000000) {
      return `${(vol / 1000000000).toFixed(2)}B`;
    }
    if (vol >= 1000000) {
      return `${(vol / 1000000).toFixed(2)}M`;
    }
    if (vol >= 1000) {
      return `${(vol / 1000).toFixed(2)}K`;
    }
    return vol.toFixed(2);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const spread = askPrice - bidPrice;
  const spreadPercent = (spread / bidPrice) * 100;

  return (
    <div className="bg-card border-b border-gray-200 ml-1 mr-1 mb-0 mt-0 rounded-xs">
      <div className="px-4 py-2">
        {/* Header Row - Symbol, Price, and Connection Status */}
        <div className="flex items-center justify-between mb-0">
          {/* Left - Symbol and Price */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-gray-900">{selectedSymbol}</span>
              <span 
                className={`text-xl font-bold transition-all duration-300 ${getPriceColor()} ${getFlashClass()} px-1 rounded`}
              >
                ${formatPrice(currentPrice)}
              </span>
              <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${
                isPositive 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {isPositive ? '+' : ''}{formatPrice(priceChange)} 
                  ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Right - Connection Status and Time */}
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-1 px-2 py-0.5 rounded-md text-xs font-medium ${
              wsConnected 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {wsConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              <span>{wsConnected ? 'Live' : 'Offline'}</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-200">
              <Clock className="h-3 w-3" />
              <span>{new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              })}</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Price Stats */}
          <div className="space-y-0.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">High 24h:</span>
              <span className="font-semibold text-gray-900">${formatPrice(highPrice)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Low 24h:</span>
              <span className="font-semibold text-gray-900">${formatPrice(lowPrice)}</span>
            </div>
          </div>

          {/* Volume Stats */}
          <div className="space-y-0.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                Volume:
              </span>
              <span className="font-semibold text-gray-900">{formatVolume(volume)} {baseAsset}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Vol(USDT):</span>
              <span className="font-semibold text-gray-900">${formatVolume(quoteVolume)}</span>
            </div>
          </div>

          {/* Order Book Stats */}
          <div className="space-y-0.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Bid:</span>
              <span className="font-semibold text-green-600">${formatPrice(bidPrice)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Ask:</span>
              <span className="font-semibold text-red-600">${formatPrice(askPrice)}</span>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="space-y-0.5">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Trades:
              </span>
              <span className="font-semibold text-gray-900">{formatNumber(tradeCount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Spread:</span>
              <span className="font-semibold text-gray-900">{spreadPercent.toFixed(3)}%</span>
            </div>
          </div>
        </div>

        {/* User Balance Row (if available) */}
        {userBalance && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Your Balance:</span>
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-gray-900">
                  {parseFloat(userBalance.free).toFixed(4)} {baseAsset} 
                  <span className="text-gray-500 ml-1 font-normal">(Available)</span>
                </span>
                {parseFloat(userBalance.locked) > 0 && (
                  <span className="font-semibold text-orange-600">
                    {parseFloat(userBalance.locked).toFixed(4)} {baseAsset}
                    <span className="text-gray-500 ml-1 font-normal">(Locked)</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}