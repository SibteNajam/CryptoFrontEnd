'use client';

import React from 'react';
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
  
  // Loading state
  if (isLoading || !tickerData) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-4">
              <div className="animate-pulse flex items-center space-x-2">
                <div className="h-6 bg-gray-200 rounded w-20"></div>
                <div className="h-6 bg-gray-200 rounded w-24"></div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {wsConnected ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-xs">Disconnected</span>
                </div>
              )}
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
          </div>
          <div className="animate-pulse flex space-x-6">
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
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
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-6 py-4">
        {/* Header Row - Symbol, Price, and Connection Status */}
        <div className="flex items-center justify-between mb-3">
          {/* Left - Symbol and Price */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <span className="text-xl font-bold text-gray-900">{selectedSymbol}</span>
              <span className="text-2xl font-bold text-gray-900">${formatPrice(currentPrice)}</span>
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${
                isPositive 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-red-100 text-red-700 border border-red-200'
              }`}>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span>
                  {isPositive ? '+' : ''}{formatPrice(priceChange)} 
                  ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Right - Connection Status and Time */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium ${
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
            <div className="flex items-center space-x-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md border">
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {/* Price Stats */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">High 24h:</span>
              <span className="font-semibold text-gray-900">${formatPrice(highPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Low 24h:</span>
              <span className="font-semibold text-gray-900">${formatPrice(lowPrice)}</span>
            </div>
          </div>

          {/* Volume Stats */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1">
                <Volume2 className="h-3 w-3" />
                Volume:
              </span>
              <span className="font-semibold text-gray-900">{formatVolume(volume)} {baseAsset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vol(USDT):</span>
              <span className="font-semibold text-gray-900">${formatVolume(quoteVolume)}</span>
            </div>
          </div>

          {/* Order Book Stats */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Bid:</span>
              <span className="font-semibold text-green-600">${formatPrice(bidPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ask:</span>
              <span className="font-semibold text-red-600">${formatPrice(askPrice)}</span>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Trades:
              </span>
              <span className="font-semibold text-gray-900">{formatNumber(tradeCount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Spread:</span>
              <span className="font-semibold text-gray-900">{spreadPercent.toFixed(3)}%</span>
            </div>
          </div>
        </div>

        {/* User Balance Row (if available) */}
        {userBalance && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Your Balance:</span>
              <div className="flex items-center space-x-4">
                <span className="font-semibold text-gray-900">
                  {parseFloat(userBalance.free).toFixed(4)} {baseAsset} (Available)
                </span>
                {parseFloat(userBalance.locked) > 0 && (
                  <span className="text-orange-600">
                    {parseFloat(userBalance.locked).toFixed(4)} {baseAsset} (Locked)
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