'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Filter, ArrowDown, RefreshCw, BarChart3 } from 'lucide-react';

interface OrderBookEntry {
  price: string | number;
  qty: string | number;
  total?: number;
  accumulated?: number;
}

interface OrderBookProps {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  precision?: number;
  depth?: number;
  isLoading: boolean;
  lastUpdateTime?: string;
  onRefresh: () => void;
  refreshInterval?: number;
}

const FILTER_OPTIONS = [
  { value: 0.01, label: '0.01' },
  { value: 0.1, label: '0.1' },
  { value: 1, label: '1' },
  { value: 10, label: '10' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];

export default function BinanceOrderBook({
  symbol,
  bids,
  asks,
  precision = 2,
  depth = 15,
  isLoading,
  lastUpdateTime,
  onRefresh,
  refreshInterval = 3000,
}: OrderBookProps) {
  const [quantityFilter, setQuantityFilter] = useState<number>(0.1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [timeSinceRefresh, setTimeSinceRefresh] = useState<number>(0);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false); // Only for manual refresh
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshCountdownRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced refresh function to handle manual vs auto refresh
  const handleRefresh = (isManual = false) => {
    if (isManual) {
      setIsManualRefreshing(true);
    }
    onRefresh();
    setLastRefresh(new Date());
    setTimeSinceRefresh(0);
    
    // Reset manual refresh state after a short delay
    if (isManual) {
      setTimeout(() => {
        setIsManualRefreshing(false);
      }, 500);
    }
  };

  // Set up auto-refresh with silent updates
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    if (refreshCountdownRef.current) {
      clearInterval(refreshCountdownRef.current);
    }

    // Silent auto-refresh (no visual feedback)
    refreshTimerRef.current = setInterval(() => {
      if (!isManualRefreshing) {
        handleRefresh(false); // Silent refresh
      }
    }, refreshInterval);

    refreshCountdownRef.current = setInterval(() => {
      setTimeSinceRefresh(prev => prev + 100);
    }, 100);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (refreshCountdownRef.current) clearInterval(refreshCountdownRef.current);
    };
  }, [refreshInterval, isManualRefreshing]);

  // Process bids and asks with accumulation and apply filter
  const processedData = useMemo(() => {
    const processedAsks = [...asks]
      .sort((a, b) => parseFloat(a.price as string) - parseFloat(b.price as string))
      .filter(ask => parseFloat(ask.qty as string) >= quantityFilter)
      .map((ask, index, array) => {
        const price = parseFloat(ask.price as string);
        const quantity = parseFloat(ask.qty as string);
        const accumulated = array
          .slice(0, index + 1)
          .reduce((sum, item) => sum + parseFloat(item.qty as string), 0);
        
        return {
          ...ask,
          price,
          qty: quantity,
          total: price * quantity,
          accumulated,
        };
      })
      .slice(0, depth);

    const processedBids = [...bids]
      .sort((a, b) => parseFloat(b.price as string) - parseFloat(a.price as string))
      .filter(bid => parseFloat(bid.qty as string) >= quantityFilter)
      .map((bid, index, array) => {
        const price = parseFloat(bid.price as string);
        const quantity = parseFloat(bid.qty as string);
        const accumulated = array
          .slice(0, index + 1)
          .reduce((sum, item) => sum + parseFloat(item.qty as string), 0);
        
        return {
          ...bid,
          price,
          qty: quantity,
          total: price * quantity,
          accumulated,
        };
      })
      .slice(0, depth);

    return {
      asks: processedAsks,
      bids: processedBids,
    };
  }, [bids, asks, depth, quantityFilter]);

  const formatNumber = (num: number, places: number = precision) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: places,
      maximumFractionDigits: places,
    });
  };

  const maxQuantity = useMemo(() => {
    const bidMax = Math.max(...processedData.bids.map(b => b.qty as number), 0);
    const askMax = Math.max(...processedData.asks.map(a => a.qty as number), 0);
    return Math.max(bidMax, askMax);
  }, [processedData]);

  const getDepthWidth = (quantity: number) => {
    return maxQuantity > 0 ? (quantity / maxQuantity) * 100 : 0;
  };

  const handleFilterSelect = (value: number) => {
    setQuantityFilter(value);
    setIsFilterOpen(false);
  };

  const refreshProgress = (timeSinceRefresh / refreshInterval) * 100;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Enhanced Header */}
      <div className="border-b border-gray-200 px-3 py-3 flex-shrink-0 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            Order Book <span className="text-blue-600 font-bold">{symbol}</span>
          </h3>
          
          {/* Manual Refresh Button - only shows loading for manual refresh */}
          <button
            onClick={() => handleRefresh(true)}
            disabled={isManualRefreshing}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 transform hover:scale-105 ${
              isManualRefreshing 
                ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-500' 
                : 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md'
            }`}
            title="Refresh order book data"
          >
            <RefreshCw size={12} className={isManualRefreshing ? "animate-spin" : ""} />
            <span>{isManualRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors border border-blue-200"
              >
                <Filter size={10} />
                <span>{quantityFilter}</span>
                <ArrowDown size={10} />
              </button>
              {isFilterOpen && (
                <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 min-w-[80px]">
                  {FILTER_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterSelect(option.value)}
                      className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 transition-colors ${
                        quantityFilter === option.value ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Depth info */}
          <div className="text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <BarChart3 size={10} />
              Depth: {depth}
            </span>
          </div>
        </div>
      </div>

      {/* Order Book Body - No loading state for auto-refresh */}
      <div className="flex-1 overflow-y-auto s" style={{ maxHeight: '400px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Only show loading for initial load or when no data */}
        {(isLoading && processedData.bids.length === 0 && processedData.asks.length === 0) ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-blue-600 text-sm font-medium">Loading order book...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-px">
            {/* Bids (Buy Orders) - Left Side */}
            <div className="bids-container">
              <div className="grid grid-cols-3 text-xs font-medium text-gray-600 px-3 py-2 bg-green-50/70 border-b border-green-100">
                <div>Price</div>
                <div className="text-right">Amount</div>
                <div className="text-right">Total</div>
              </div>
              {processedData.bids.map((bid, index) => (
                <div key={`bid-${index}-${bid.price}`} className="relative grid grid-cols-3 text-xs py-2 px-3 hover:bg-green-50 transition-colors duration-200">
                  <div 
                    className="absolute right-0 top-0 bottom-0 bg-green-100/60 z-0 rounded-sm" 
                    style={{ width: `${getDepthWidth(bid.qty as number)}%` }}
                  ></div>
                  
                  <div className="text-green-600 font-semibold z-10">
                    {formatNumber(bid.price as number)}
                  </div>
                  <div className="text-right font-medium text-gray-900 z-10">
                    {formatNumber(bid.qty as number, 4)}
                  </div>
                  <div className="text-right text-gray-700 z-10">
                    {formatNumber(bid.total || 0)}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Asks (Sell Orders) - Right Side */}
            <div className="asks-container">
              <div className="grid grid-cols-3 text-xs font-medium text-gray-600 px-3 py-2 bg-red-50/70 border-b border-red-100">
                <div>Price</div>
                <div className="text-right">Amount</div>
                <div className="text-right">Total</div>
              </div>
              {processedData.asks.map((ask, index) => (
                <div key={`ask-${index}-${ask.price}`} className="relative grid grid-cols-3 text-xs py-2 px-3 hover:bg-red-50 transition-colors duration-200">
                  <div 
                    className="absolute right-0 top-0 bottom-0 bg-red-100/60 z-0 rounded-sm" 
                    style={{ width: `${getDepthWidth(ask.qty as number)}%` }}
                  ></div>
                  
                  <div className="text-red-600 font-semibold z-10">
                    {formatNumber(ask.price as number)}
                  </div>
                  <div className="text-right font-medium text-gray-900 z-10">
                    {formatNumber(ask.qty as number, 4)}
                  </div>
                  <div className="text-right text-gray-700 z-10">
                    {formatNumber(ask.total || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Footer */}
      <div className="p-2 border-t border-gray-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 text-xs text-gray-600 flex justify-between items-center flex-shrink-0">
        <span className="text-blue-600 font-medium">
          {processedData.bids.length} bids / {processedData.asks.length} asks
        </span>
        <span className="text-gray-500">
          Filter: {quantityFilter}+ only
        </span>
      </div>
    </div>
  );
}