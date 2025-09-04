'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowDownUp, Filter, ArrowDown, RefreshCw } from 'lucide-react';

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
  refreshInterval?: number; // Time in ms for auto-refresh
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
  refreshInterval = 3000, // Default to 3 seconds
}: OrderBookProps) {
  const [quantityFilter, setQuantityFilter] = useState<number>(100);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [layout, setLayout] = useState<'combined' | 'split'>('combined');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [timeSinceRefresh, setTimeSinceRefresh] = useState<number>(0);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshCountdownRef = useRef<NodeJS.Timeout | null>(null);

  // Set up auto-refresh
  useEffect(() => {
    // Clear any existing timers
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    if (refreshCountdownRef.current) {
      clearInterval(refreshCountdownRef.current);
    }

    // Set up auto-refresh timer
    refreshTimerRef.current = setInterval(() => {
      if (!isLoading) {
        onRefresh();
        setLastRefresh(new Date());
        setTimeSinceRefresh(0);
      }
    }, refreshInterval);

    // Set up countdown timer (updates every 100ms for smoother display)
    refreshCountdownRef.current = setInterval(() => {
      setTimeSinceRefresh(prev => prev + 100);
    }, 100);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (refreshCountdownRef.current) clearInterval(refreshCountdownRef.current);
    };
  }, [refreshInterval, isLoading, onRefresh]);

  // Process bids and asks with accumulation and apply filter
  const processedData = useMemo(() => {
    // Process asks (sell orders) - ascending order by price
    const processedAsks = [...asks]
      .sort((a, b) => parseFloat(a.price as string) - parseFloat(b.price as string)) // Lower price first for asks
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

    // Process bids (buy orders) - descending order by price
    const processedBids = [...bids]
      .sort((a, b) => parseFloat(b.price as string) - parseFloat(a.price as string)) // Higher price first for bids
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

  // Format number with specified precision
  const formatNumber = (num: number, places: number = precision) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: places,
      maximumFractionDigits: places,
    });
  };

  // Determine the max quantity for visual depth indicator
  const maxQuantity = useMemo(() => {
    const bidMax = Math.max(...processedData.bids.map(b => b.qty as number), 0);
    const askMax = Math.max(...processedData.asks.map(a => a.qty as number), 0);
    return Math.max(bidMax, askMax);
  }, [processedData]);

  // Calculate depth bar width as percentage
  const getDepthWidth = (quantity: number) => {
    return maxQuantity > 0 ? (quantity / maxQuantity) * 100 : 0;
  };

  // Toggle filter dropdown
  const toggleFilter = () => setIsFilterOpen(!isFilterOpen);

  // Handle filter selection
  const handleFilterSelect = (value: number) => {
    setQuantityFilter(value);
    setIsFilterOpen(false);
  };

  // Toggle layout between combined and split view
  const toggleLayout = () => {
    setLayout(layout === 'combined' ? 'split' : 'combined');
  };

  // Calculate refresh progress as a percentage
  const refreshProgress = (timeSinceRefresh / refreshInterval) * 100;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          Order Book <span className="text-blue-500">{symbol}</span>
          
          {/* Add refresh countdown */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-100" 
                style={{ width: `${refreshProgress}%` }}
              ></div>
            </div>
            <span className="min-w-[40px]">
              {Math.max(0, Math.ceil((refreshInterval - timeSinceRefresh) / 1000))}s
            </span>
          </div>
        </h3>
        <div className="flex items-center gap-2">
          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={toggleFilter}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <Filter size={12} />
              <span>Filter: {quantityFilter}</span>
              <ArrowDown size={12} />
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                {FILTER_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterSelect(option.value)}
                    className={`block w-full text-left px-4 py-2 text-xs hover:bg-gray-100 ${
                      quantityFilter === option.value ? 'bg-blue-50 text-blue-600 font-medium' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Layout Toggle */}
          <button
            onClick={toggleLayout}
            className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            title={layout === 'combined' ? 'Switch to split view' : 'Switch to combined view'}
          >
            <ArrowDownUp size={12} />
          </button>
          
          {/* Manual Refresh Button */}
          <button
            onClick={() => {
              onRefresh();
              setLastRefresh(new Date());
              setTimeSinceRefresh(0);
            }}
            disabled={isLoading}
            className={`flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title="Refresh order book data"
          >
            <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
            <span>{isLoading ? 'Loading...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 text-xs font-medium text-gray-500 px-3 py-2 bg-gray-50">
        <div>Price (USDT)</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Total</div>
      </div>

      {/* Order Book Body */}
      <div className="order-book-container max-h-[500px] overflow-y-auto">
        {layout === 'combined' ? (
          // Combined Layout (Asks on top, Bids on bottom)
          <>
            {/* Asks (Sell Orders) - In reverse to show highest price at top */}
            <div className="asks-container">
              {processedData.asks.slice().reverse().map((ask, index) => (
                <div key={`ask-${index}-${ask.price}`} className="relative grid grid-cols-3 text-xs py-1.5 px-3 border-b border-gray-100 hover:bg-red-50">
                  {/* Background depth indicator */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 bg-red-100 z-0" 
                    style={{ width: `${getDepthWidth(ask.qty as number)}%` }}
                  ></div>
                  
                  {/* Price */}
                  <div className="text-red-600 font-medium z-10">
                    {formatNumber(ask.price as number)}
                  </div>
                  
                  {/* Quantity - IMPROVED VISIBILITY */}
                  <div className="text-right font-medium text-gray-900 z-10">
                    {formatNumber(ask.qty as number, 4)}
                  </div>
                  
                  {/* Total */}
                  <div className="text-right text-gray-700 z-10">
                    {formatNumber(ask.total || 0)}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Spread Indicator */}
            {processedData.asks.length > 0 && processedData.bids.length > 0 && (
              <div className="grid grid-cols-3 text-xs py-1.5 px-3 bg-gray-100 border-y border-gray-200">
                <div className="font-medium text-gray-600">
                  Spread: {formatNumber((processedData.asks[0].price as number) - (processedData.bids[0].price as number))}
                </div>
                <div className="text-right font-medium text-gray-600">
                  {`${(((processedData.asks[0].price as number) - (processedData.bids[0].price as number)) / (processedData.bids[0].price as number) * 100).toFixed(2)}%`}
                </div>
                <div className="text-right">
                  {lastUpdateTime ? 
                    <span className="text-gray-600">{new Date(lastUpdateTime).toLocaleTimeString()}</span> : ''}
                </div>
              </div>
            )}
            
            {/* Bids (Buy Orders) */}
            <div className="bids-container">
              {processedData.bids.map((bid, index) => (
                <div key={`bid-${index}-${bid.price}`} className="relative grid grid-cols-3 text-xs py-1.5 px-3 border-b border-gray-100 hover:bg-green-50">
                  {/* Background depth indicator */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 bg-green-100 z-0" 
                    style={{ width: `${getDepthWidth(bid.qty as number)}%` }}
                  ></div>
                  
                  {/* Price */}
                  <div className="text-green-600 font-medium z-10">
                    {formatNumber(bid.price as number)}
                  </div>
                  
                  {/* Quantity - IMPROVED VISIBILITY */}
                  <div className="text-right font-medium text-gray-900 z-10">
                    {formatNumber(bid.qty as number, 4)}
                  </div>
                  
                  {/* Total */}
                  <div className="text-right text-gray-700 z-10">
                    {formatNumber(bid.total || 0)}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          // Split Layout (Bids and Asks side by side)
          <div className="grid grid-cols-2 gap-0.5">
            {/* Bids (Buy Orders) */}
            <div className="bids-container">
              <div className="grid grid-cols-3 text-xs font-medium text-gray-500 px-3 py-1 bg-green-50">
                <div>Price</div>
                <div className="text-right">Amount</div>
                <div className="text-right">Total</div>
              </div>
              {processedData.bids.map((bid, index) => (
                <div key={`bid-${index}-${bid.price}`} className="relative grid grid-cols-3 text-xs py-1.5 px-3 border-b border-gray-100 hover:bg-green-50">
                  {/* Background depth indicator */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 bg-green-100 z-0" 
                    style={{ width: `${getDepthWidth(bid.qty as number)}%` }}
                  ></div>
                  
                  <div className="text-green-600 font-medium z-10">
                    {formatNumber(bid.price as number)}
                  </div>
                  {/* IMPROVED VISIBILITY */}
                  <div className="text-right font-medium text-gray-900 z-10">
                    {formatNumber(bid.qty as number, 4)}
                  </div>
                  <div className="text-right text-gray-700 z-10">
                    {formatNumber(bid.total || 0)}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Asks (Sell Orders) */}
            <div className="asks-container">
              <div className="grid grid-cols-3 text-xs font-medium text-gray-500 px-3 py-1 bg-red-50">
                <div>Price</div>
                <div className="text-right">Amount</div>
                <div className="text-right">Total</div>
              </div>
              {processedData.asks.map((ask, index) => (
                <div key={`ask-${index}-${ask.price}`} className="relative grid grid-cols-3 text-xs py-1.5 px-3 border-b border-gray-100 hover:bg-red-50">
                  {/* Background depth indicator */}
                  <div 
                    className="absolute right-0 top-0 bottom-0 bg-red-100 z-0" 
                    style={{ width: `${getDepthWidth(ask.qty as number)}%` }}
                  ></div>
                  
                  <div className="text-red-600 font-medium z-10">
                    {formatNumber(ask.price as number)}
                  </div>
                  {/* IMPROVED VISIBILITY */}
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

      {/* Order Book Footer */}
      <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between items-center">
        <span>Depth: {processedData.bids.length} bids / {processedData.asks.length} asks</span>
        <span>Filter: {quantityFilter}+ only</span>
      </div>
    </div>
  );
}