'use client';

import React from 'react';
import { Clock, Loader2, Activity, TrendingUp, TrendingDown } from 'lucide-react';

interface BinanceTickerData {
  symbol: string;
  ticker: {
    symbol: string;
    priceChange: string;
    priceChangePercent: string;
    lastPrice: string;
    highPrice: string;
    lowPrice: string;
    openPrice: string;
    volume: string;
    quoteVolume: string;
    bidPrice: string;
    askPrice: string;
    count: number;
  };
}

interface TradingPanelProps {
  selectedSymbol: string;
  selectedInterval: string;
  chartLoading: boolean;
  tickerData: BinanceTickerData | null;
  onIntervalChange: (interval: string) => void;
  children?: React.ReactNode;
}

const INTERVALS = [
  { value: '1m', label: '1m', name: '1 Minute' },
  { value: '5m', label: '5m', name: '5 Minutes' },
  { value: '15m', label: '15m', name: '15 Minutes' },
  { value: '30m', label: '30m', name: '30 Minutes' },
  { value: '1h', label: '1h', name: '1 Hour' },
  { value: '4h', label: '4h', name: '4 Hours' },
  { value: '1d', label: '1D', name: '1 Day' },
  { value: '3d', label: '3D', name: '3 Days' },
  { value: '1M', label: '1M', name: '1 Month' },
];

export default function TradingPanel({
  selectedSymbol,
  selectedInterval,
  chartLoading,
  tickerData,
  onIntervalChange,
  children
}: TradingPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {selectedSymbol}
              </h2>
              <p className="text-sm text-gray-600">Live Trading Data</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
              <Clock size={16} />
              <span>Interval: {selectedInterval}</span>
            </div>
            {chartLoading && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm font-medium">Loading...</span>
              </div>
            )}
          </div>
        </div>

        {/* Interval Selection */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Time Intervals</h3>
          <div className="flex flex-wrap gap-2">
            {INTERVALS.map((interval) => (
              <button
                key={interval.value}
                onClick={() => onIntervalChange(interval.value)}
                disabled={chartLoading}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200
                  ${selectedInterval === interval.value
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : chartLoading
                      ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                  }
                `}
                title={interval.name}
              >
                {interval.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Price Information */}
      {tickerData && (
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-700">Current Price</p>
                <TrendingUp size={16} className="text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">
                ${parseFloat(tickerData.ticker.lastPrice).toLocaleString()}
              </p>
            </div>

            <div className={`p-4 rounded-xl border ${
              parseFloat(tickerData.ticker.priceChangePercent) >= 0
                ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'
                : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-medium ${
                  parseFloat(tickerData.ticker.priceChangePercent) >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  24h Change
                </p>
                {parseFloat(tickerData.ticker.priceChangePercent) >= 0 ? (
                  <TrendingUp size={16} className="text-green-600" />
                ) : (
                  <TrendingDown size={16} className="text-red-600" />
                )}
              </div>
              <p className={`text-2xl font-bold ${
                parseFloat(tickerData.ticker.priceChangePercent) >= 0 ? 'text-green-900' : 'text-red-900'
              }`}>
                {parseFloat(tickerData.ticker.priceChangePercent).toFixed(2)}%
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-700">24h High</p>
                <TrendingUp size={16} className="text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">
                ${parseFloat(tickerData.ticker.highPrice).toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-red-700">24h Low</p>
                <TrendingDown size={16} className="text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-900">
                ${parseFloat(tickerData.ticker.lowPrice).toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-purple-700">24h Volume</p>
                <Activity size={16} className="text-purple-600" />
              </div>
              <p className="text-xl font-bold text-purple-900">
                {parseFloat(tickerData.ticker.volume).toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-indigo-700">Quote Volume</p>
                <Activity size={16} className="text-indigo-600" />
              </div>
              <p className="text-xl font-bold text-indigo-900">
                {parseFloat(tickerData.ticker.quoteVolume).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart and Additional Content */}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}