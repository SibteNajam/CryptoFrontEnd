'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useExchangeWebSocket } from '@/hooks/useExchangeWebSocket';

interface TickerData {
  [key: string]: string | number;
}

interface ExchangeTickerBarProps {
  symbol: string;
  onSymbolClick?: (symbol: string) => void;
}

export default function ExchangeTickerBar({ symbol, onSymbolClick }: ExchangeTickerBarProps) {
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const [exchange, setExchange] = useState<'binance' | 'bitget'>('binance');

  const { subscribeBinanceSymbol, subscribeBitgetSymbol, selectedExchange, isConnected } = useExchangeWebSocket({
    onTickerUpdate: (data: any) => {
      console.log('📊 Ticker update received:', data.symbol);
      console.log('📊 Raw ticker data:', JSON.stringify(data, null, 2));
      
      // Normalize the data format for both exchanges
      const normalizedData = {
        symbol: data.symbol,
        ticker: {
          symbol: data.ticker.symbol,
          lastPrice: data.ticker.lastPrice,
          openPrice: data.ticker.openPrice,
          highPrice: data.ticker.highPrice,
          lowPrice: data.ticker.lowPrice,
          priceChange24h: data.ticker.priceChange24h || data.ticker.priceChange,
          bidPrice: data.ticker.bidPrice,
          askPrice: data.ticker.askPrice,
          bidSize: data.ticker.bidSize || '0',
          askSize: data.ticker.askSize || '0',
          baseVolume: data.ticker.baseVolume || data.ticker.volume,
          quoteVolume: data.ticker.quoteVolume,
          openUtc: data.ticker.openUtc || data.ticker.openPrice,
          changeUtc24h: data.ticker.changeUtc24h || data.ticker.priceChangePercent,
        },
        timestamp: data.timestamp
      };

      console.log('📊 Normalized ticker data:', JSON.stringify(normalizedData, null, 2));
      setTickerData(normalizedData.ticker);
      // Exchange is determined by selectedExchange from Redux, not from symbol
      setExchange(selectedExchange as 'binance' | 'bitget');
    },
    onConnectionStatus: (status: string) => {
      console.log('🔗 Connection status update:', status);
      setConnectionStatus(status);
    },
  });

  // Update local exchange state when selectedExchange changes
  useEffect(() => {
    if (selectedExchange) {
      setExchange(selectedExchange as 'binance' | 'bitget');
      // Clear ticker data when switching exchanges
      setTickerData(null);
    }
  }, [selectedExchange]);

  // Subscribe to symbol when exchange or symbol changes
  useEffect(() => {
    console.log(`🔄 Subscription effect triggered:`, {
      selectedExchange,
      isConnected,
      symbol,
      hasSubscribeBinanceSymbol: !!subscribeBinanceSymbol,
      hasSubscribeBitgetSymbol: !!subscribeBitgetSymbol
    });

    if (!isConnected || !symbol) {
      console.log('⚠️ Skipping subscription - not connected or no symbol');
      return;
    }

    if (selectedExchange === 'binance') {
      // Small delay to ensure socket is ready
      const timeoutId = setTimeout(() => {
        console.log(`📡 Subscribing to Binance ${symbol}`);
        subscribeBinanceSymbol(symbol, '1m');
      }, 500);
      
      return () => clearTimeout(timeoutId);
    } else if (selectedExchange === 'bitget') {
      // Small delay to ensure socket is ready
      const timeoutId = setTimeout(() => {
        console.log(`📡 Subscribing to Bitget ${symbol}`);
        subscribeBitgetSymbol(symbol);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [symbol, selectedExchange, isConnected, subscribeBinanceSymbol, subscribeBitgetSymbol]);

  if (!tickerData) {
    return (
      <div className="bg-card border border-default rounded-lg p-4">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Activity className="w-4 h-4 animate-pulse" />
          <span className="text-sm">Waiting for ticker data...</span>
        </div>
      </div>
    );
  }

  // Helper function to get value safely
  const getValue = (key: string): string => {
    const value = tickerData[key];
    if (value === undefined || value === null) return '-';
    return typeof value === 'number' ? value.toFixed(8).replace(/\.?0+$/, '') : String(value);
  };

  // Helper function to parse number
  const parseValue = (key: string): number => {
    const value = getValue(key);
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Determine keys based on exchange
  const priceKey = exchange === 'binance' ? 'lastPrice' : 'lastPrice';
  const changeKey = exchange === 'binance' ? 'priceChangePercent' : 'priceChange24h';
  const highKey = exchange === 'binance' ? 'highPrice' : 'highPrice';
  const lowKey = exchange === 'binance' ? 'lowPrice' : 'lowPrice';
  const volumeKey = exchange === 'binance' ? 'volume' : 'baseVolume';
  const quoteVolumeKey = exchange === 'binance' ? 'quoteVolume' : 'quoteVolume';
  const openKey = exchange === 'binance' ? 'openPrice' : 'openPrice';
  const bidKey = exchange === 'binance' ? 'bidPrice' : 'bidPrice';
  const askKey = exchange === 'binance' ? 'askPrice' : 'askPrice';

  const lastPrice = parseValue(priceKey);
  const priceChange = parseValue(changeKey);
  const high24h = parseValue(highKey);
  const low24h = parseValue(lowKey);
  const volume = parseValue(volumeKey);
  const quoteVolume = parseValue(quoteVolumeKey);
  const openPrice = parseValue(openKey);
  const bidPrice = parseValue(bidKey);
  const askPrice = parseValue(askKey);

  // Calculate price change percentage if not provided
  let changePercent = priceChange;
  if (exchange === 'bitget' && openPrice > 0) {
    // Bitget provides change as decimal (0.023 = 2.3%)
    changePercent = priceChange * 100;
  }

  const isPositive = changePercent >= 0;

  return (
    <div className="bg-card border-b border-default">
      <div className="px-4 py-2">
        {/* Header */}
        <div className="bg-muted px-4 py-2 border-b border-default flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-card-foreground">{symbol}</h3>
            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
              {exchange.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'} animate-pulse`}></div>
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Ticker Stats */}
        <div className="grid grid-cols-6 gap-4 text-xs">
          {/* 24h High/Low */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">24h High</span>
              <span className="font-semibold text-card-foreground">${high24h.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">24h Low</span>
              <span className="font-semibold text-card-foreground">${low24h.toFixed(2)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vol({symbol.replace('USDT', '')})</span>
              <span className="font-semibold text-card-foreground">{volume.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vol(USDT)</span>
              <span className="font-semibold text-card-foreground">${quoteVolume.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          {/* Bid/Ask */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bid</span>
              <span className="font-semibold text-green-600 dark:text-green-400">${bidPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ask</span>
              <span className="font-semibold text-red-600 dark:text-red-400">${askPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Open Price & Change */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Open</span>
              <span className="font-semibold text-card-foreground">${openPrice.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Change</span>
              <span className={`font-semibold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {isPositive ? '+' : ''}{priceChange.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Last Price & Change % */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Price</span>
              <span className="font-bold text-card-foreground text-lg">${lastPrice.toFixed(2)}</span>
            </div>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
              isPositive ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}>
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </div>
          </div>

          {/* Spread */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Spread</span>
              <span className="font-semibold text-card-foreground">{((askPrice - bidPrice) / bidPrice * 100).toFixed(3)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Trades</span>
              <span className="font-semibold text-card-foreground">-</span>
            </div>
          </div>
        </div>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-3">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-card-foreground">
              Debug Info
            </summary>
            <div className="mt-2 p-2 bg-muted rounded text-xs font-mono max-h-40 overflow-auto">
              <pre>{JSON.stringify(tickerData, null, 2)}</pre>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}
