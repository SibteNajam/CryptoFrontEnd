'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Filter, ArrowDown, RefreshCw, BarChart3 } from 'lucide-react';
import { useAppSelector } from '@/infrastructure/store/hooks';

// Normalized OrderBook entry - common format for all exchanges
interface NormalizedOrderBookEntry {
  price: string;
  qty: string;
  total?: number;
  accumulated?: number;
}

interface OrderBookData {
  lastUpdateId: number;
  bids: NormalizedOrderBookEntry[];
  asks: NormalizedOrderBookEntry[];
  timestamp?: string;
}

interface OrderBookProps {
  symbol: string;
}

const FILTER_OPTIONS = [
  { value: 0.01, label: '0.01' },
  { value: 0.1, label: '0.1' },
  { value: 1, label: '1' },
  { value: 10, label: '10' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];

export default function BinanceOrderBook({ symbol }: OrderBookProps) {
  // Get selected exchange from Redux
  const { selectedExchange } = useAppSelector(state => state.exchange);
  
  // OrderBook internal state
  const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [orderBookDepth, setOrderBookDepth] = useState<string>('150');
  const [refreshInterval] = useState(3000);
  
  const [quantityFilter, setQuantityFilter] = useState<number>(0.1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [timeSinceRefresh, setTimeSinceRefresh] = useState<number>(0);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshCountdownRef = useRef<NodeJS.Timeout | null>(null);
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  // Fetch OrderBook data
  const fetchOrderBook = async (isManual = false) => {
    if (!symbol) return;

    if (isManual) {
      setIsManualRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      console.log(`🔄 Fetching order book for ${symbol} from ${selectedExchange}`);

      let response;
      if (selectedExchange === 'binance') {
        response = await fetch(
          `${API_BASE_URL}/binance/orderBook?symbol=${symbol}&limit=${orderBookDepth}`
        );
      } else if (selectedExchange === 'bitget') {
        response = await fetch(
          `${API_BASE_URL}/bitget/orderbook?symbol=${symbol}&limit=${orderBookDepth}`
        );
      } else {
        throw new Error(`Unsupported exchange: ${selectedExchange}`);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Normalize Bitget response to match Binance format
      let normalizedData;
      if (selectedExchange === 'bitget') {
        normalizedData = {
          lastUpdateId: parseInt(data.timestamp || '0'),
          bids: data.bids.map((bid: any) => ({
            price: bid.price,
            qty: bid.quantity
          })),
          asks: data.asks.map((ask: any) => ({
            price: ask.price,
            qty: ask.quantity
          }))
        };
      } else {
        normalizedData = data;
      }

      const orderBookWithTimestamp: OrderBookData = {
        ...normalizedData,
        timestamp: new Date().toISOString()
      };

      setOrderBookData(orderBookWithTimestamp);
      setLastRefresh(new Date());
      setTimeSinceRefresh(0);
      
      console.log('📊 Order Book Data loaded:', {
        exchange: selectedExchange,
        symbol: symbol,
        bids: orderBookWithTimestamp.bids.length,
        asks: orderBookWithTimestamp.asks.length,
        timestamp: new Date().toLocaleTimeString()
      });

    } catch (error) {
      console.error('❌ Error fetching order book:', error);
    } finally {
      setIsLoading(false);
      if (isManual) {
        setTimeout(() => {
          setIsManualRefreshing(false);
        }, 500);
      }
    }
  };

  // Fetch data when symbol or exchange changes
  useEffect(() => {
    if (symbol) {
      fetchOrderBook(false);
    }
  }, [symbol, selectedExchange, orderBookDepth]);

  // Set up auto-refresh
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    if (refreshCountdownRef.current) {
      clearInterval(refreshCountdownRef.current);
    }

    // Silent auto-refresh
    refreshTimerRef.current = setInterval(() => {
      if (!isManualRefreshing && symbol) {
        fetchOrderBook(false);
      }
    }, refreshInterval);

    // Countdown timer
    refreshCountdownRef.current = setInterval(() => {
      setTimeSinceRefresh(prev => prev + 100);
    }, 100);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (refreshCountdownRef.current) clearInterval(refreshCountdownRef.current);
    };
  }, [refreshInterval, isManualRefreshing, symbol, selectedExchange]);

  // Determine precision based on symbol
  const precision = useMemo(() => {
    return symbol.includes('BTC') ? 2 : symbol.includes('ETH') ? 2 : 4;
  }, [symbol]);

  // Display depth
  const displayDepth = 20;

  // Process bids and asks with accumulation and apply filter
  const processedData = useMemo(() => {
    if (!orderBookData) {
      return { asks: [], bids: [] };
    }

    const processedAsks = [...orderBookData.asks]
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
      .filter(ask => parseFloat(ask.qty) >= quantityFilter)
      .map((ask, index, array) => {
        const price = parseFloat(ask.price);
        const quantity = parseFloat(ask.qty);
        const accumulated = array
          .slice(0, index + 1)
          .reduce((sum, item) => sum + parseFloat(item.qty), 0);
        
        return {
          ...ask,
          price,
          qty: quantity,
          total: price * quantity,
          accumulated,
        };
      })
      .slice(0, displayDepth);

    const processedBids = [...orderBookData.bids]
      .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
      .filter(bid => parseFloat(bid.qty) >= quantityFilter)
      .map((bid, index, array) => {
        const price = parseFloat(bid.price);
        const quantity = parseFloat(bid.qty);
        const accumulated = array
          .slice(0, index + 1)
          .reduce((sum, item) => sum + parseFloat(item.qty), 0);
        
        return {
          ...bid,
          price,
          qty: quantity,
          total: price * quantity,
          accumulated,
        };
      })
      .slice(0, displayDepth);

    return {
      asks: processedAsks,
      bids: processedBids,
    };
  }, [orderBookData, displayDepth, quantityFilter]);

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

  // Show loading state
  if (!orderBookData && isLoading) {
    return (
      <div className="bg-card border border-default shadow-sm overflow-hidden flex flex-col h-full">
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-6">
            <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs text-muted-foreground">Loading order book...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!orderBookData) {
    return (
      <div className="bg-card border border-default shadow-sm overflow-hidden flex flex-col h-full" />
    );
  }

 return (
  <div className="bg-card border border-default shadow-sm overflow-hidden flex flex-col h-full">
    {/* Enhanced Header */}
    <div className="border-b border-default px-3 py-2 flex-shrink-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-primary flex items-center gap-2">
          <BarChart3 size={14} />
          Order Book
          <span className="text-blue-600 font-bold">{symbol}</span>
          <span className="text-xs text-gray-500 font-normal">({selectedExchange.toUpperCase()})</span>
        </h3>
        
        {/* Manual Refresh Button */}
        <button
          onClick={() => fetchOrderBook()}
          disabled={isManualRefreshing}
          className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium rounded-md transition-colors duration-150 ${
            isManualRefreshing 
              ? 'opacity-50 cursor-not-allowed bg-muted text-muted-foreground' 
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
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
              className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-info bg-info-light rounded-md hover-info transition-colors border border-info"
            >
              <Filter size={10} />
              <span>{quantityFilter}</span>
              <ArrowDown size={10} />
            </button>
            {isFilterOpen && (
              <div className="absolute left-0 mt-1 bg-card border border-default rounded-md shadow-lg z-20 min-w-[80px]">
                {FILTER_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterSelect(option.value)}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover-info transition-colors ${
                      quantityFilter === option.value ? 'bg-info-bg text-info-dark font-medium' : 'text-secondary'
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
        <div className="text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BarChart3 size={10} />
            Depth: {orderBookDepth}
          </span>
        </div>
      </div>
    </div>

    {/* Order Book Body */}
    <div className="flex-1 overflow-y-auto" style={{ maxHeight: '460px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {(isLoading && processedData.bids.length === 0 && processedData.asks.length === 0) ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-info-light border-t-info rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-info text-sm font-medium">Loading order book...</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-px">
          {/* Bids (Buy Orders) - Left Side */}
          <div className="bids-container">
            <div className="grid grid-cols-3 text-xs font-medium px-3 py-2 bg-success-light border-b border-success-bg">
              <div className="text-gray-700">Price</div>
              <div className="text-right text-gray-700">Amount</div>
              <div className="text-right text-gray-700">Total</div>
            </div>
            {processedData.bids.map((bid, index) => (
              <div key={`bid-${index}-${bid.price}`} className="relative grid grid-cols-3 text-xs py-2 px-3 hover-success transition-colors duration-200">
                <div 
                  className="absolute right-0 top-0 bottom-0 bg-success-bg z-0 rounded-sm" 
                  style={{ width: `${getDepthWidth(bid.qty as number)}%` }}
                ></div>
                
                <div className="text-success font-semibold z-10">
                  {formatNumber(bid.price as number)}
                </div>
                <div className="text-right font-medium text-primary z-10">
                  {formatNumber(bid.qty as number, 4)}
                </div>
                <div className="text-right text-secondary z-10">
                  {formatNumber(bid.total || 0)}
                </div>
              </div>
            ))}
          </div>
          
          {/* Asks (Sell Orders) - Right Side */}
          <div className="asks-container">
            <div className="grid grid-cols-3 text-xs font-medium px-3 py-2 bg-danger-light border-b border-danger-bg">
              <div className="text-gray-700">Price</div>
              <div className="text-right text-gray-700">Amount</div>
              <div className="text-right text-gray-700">Total</div>
            </div>
            {processedData.asks.map((ask, index) => (
              <div key={`ask-${index}-${ask.price}`} className="relative grid grid-cols-3 text-xs py-2 px-3 hover-danger transition-colors duration-200">
                <div 
                  className="absolute right-0 top-0 bottom-0 bg-danger-bg z-0 rounded-sm" 
                  style={{ width: `${getDepthWidth(ask.qty as number)}%` }}
                ></div>
                
                <div className="text-danger font-semibold z-10">
                  {formatNumber(ask.price as number)}
                </div>
                <div className="text-right font-medium text-primary z-10">
                  {formatNumber(ask.qty as number, 4)}
                </div>
                <div className="text-right text-secondary z-10">
                  {formatNumber(ask.total || 0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Enhanced Footer */}
    <div className="p-2 border-t border-default bg-gradient-light text-xs text-muted-foreground flex justify-between items-center flex-shrink-0">
      <span className="text-info font-medium">
        {processedData.bids.length} bids / {processedData.asks.length} asks
      </span>
      <span className="text-muted-foreground">
        Filter: {quantityFilter}+ only
      </span>
    </div>
  </div>
);
}
