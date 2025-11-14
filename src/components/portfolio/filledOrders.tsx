'use client';

import React, { useState, useEffect } from 'react';
import { FileText, RefreshCw } from 'lucide-react';

interface TradeHistory {
  tradeId: string;
  orderId: string;
  symbol: string;
  side: string;
  price?: string;
  priceAvg?: string;
  amount?: string; // USDT value provided by API (amount)
  size: string;
  feeDetail: any;
  cTime: string;
}

interface FilledOrdersTabProps {
  onSymbolClick?: (symbol: string) => void;
}
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const CACHE_KEY = 'filled_orders_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export default function FilledOrdersTab({ onSymbolClick }: FilledOrdersTabProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [historyDays, setHistoryDays] = useState(20);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Format helpers (matching the original code)
  const formatAmount = (v: any, maxDecimals = 8) => {
    if (v === null || v === undefined || v === '') return '0';
    const s = String(v);
    const n = parseFloat(s);
    if (isNaN(n)) return s;

    if (s.includes('.')) {
      const frac = s.split('.')[1] || '';
      if (frac.length > maxDecimals) {
        return Number(n).toFixed(maxDecimals).replace(/\.?0+$/, '');
      }
    }

    const fixed = n.toFixed(maxDecimals);
    return fixed.replace(/\.?0+$/, '');
  };

  const formatPrice = (v: any) => {
    if (v === null || v === undefined || v === '') return '-';
    const s = String(v);
    const n = parseFloat(s);
    if (isNaN(n)) return s || '-';

    if (s.includes('.')) {
      const frac = s.split('.')[1] || '';
      if (frac.length > 9) {
        return Number(n).toFixed(9).replace(/\.?0+$/, '');
      }
    }

    if (Math.abs(n) >= 1) {
      return Number(n).toFixed(8).replace(/\.?0+$/, '');
    }
    return Number(n).toFixed(9).replace(/\.?0+$/, '');
  };

  // Load cached data from localStorage
  const loadCachedData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp, days } = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid (within 5 minutes) and same historyDays
        if (now - timestamp < CACHE_DURATION && days === historyDays) {
          setTradeHistory(data);
          setLastFetchTime(timestamp);
          return true;
        }
      }
    } catch (err) {
      console.error('Error loading cached data:', err);
    }
    return false;
  };

  // Save data to localStorage
  const saveCachedData = (data: TradeHistory[]) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        days: historyDays
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      setLastFetchTime(Date.now());
    } catch (err) {
      console.error('Error saving cached data:', err);
    }
  };

  const fetchTradeHistory = async (forceRefresh = false) => {
    // If not forcing refresh, try to load from cache first
    if (!forceRefresh && loadCachedData()) {
      console.log('✅ Loaded filled orders from cache');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const now = Date.now();
      const cutoffTime = now - (historyDays * 24 * 60 * 60 * 1000);
      
      let allTrades: any[] = [];
      let lastTradeId: string | null = null;
      let shouldContinue = true;
      
      while (shouldContinue) {
        const params = new URLSearchParams({
          limit: '100'
        });
        
        if (lastTradeId) {
          params.append('idLessThan', lastTradeId);
        } else {
          params.append('endTime', now.toString());
        }
        
        const response = await fetch(`${API_BASE_URL}/bitget/order/trade-fills?${params.toString()}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setError(errorData.message || 'Failed to fetch trade history');
          return;
        }
        
        const data = await response.json();
        
        // Handle both NestJS direct response and wrapped response formats
        const trades = Array.isArray(data) ? data : (data.data || []);
        
        if (trades.length === 0) {
          shouldContinue = false;
          break;
        }
        
        allTrades = allTrades.concat(trades);
        
        const lastTrade = trades[trades.length - 1];
        lastTradeId = lastTrade.tradeId;
        
        if (trades.length < 100) {
          shouldContinue = false;
        }
      }
      
      const filteredTrades = allTrades.filter((t: any) => Number(t.cTime) >= cutoffTime);
      
      allTrades.sort((a, b) => Number(b.cTime) - Number(a.cTime));
      
      const normalized = allTrades.map((t: any) => {
        const priceStr = t.price ?? t.priceAvg ?? '0';
        const sizeStr = t.size ?? '0';
        let amountStr = t.amount ?? '0';
        const p = parseFloat(priceStr);
        const s = parseFloat(sizeStr);
        if ((!t.amount || t.amount === '') && !isNaN(p) && !isNaN(s)) {
          amountStr = String(p * s);
        }
        return {
          ...t,
          price: priceStr,
          amount: amountStr,
        };
      });
      
      setTradeHistory(normalized as TradeHistory[]);
      saveCachedData(normalized as TradeHistory[]); // Save to cache
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Error fetching trade history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch on mount, will use cache if available
    fetchTradeHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch when historyDays changes
  useEffect(() => {
    // Skip first render (already fetched in mount effect)
    if (lastFetchTime !== null) {
      fetchTradeHistory(true); // Force refresh when days change
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyDays]);

  const handleSymbolClick = (symbol: string) => {
    if (onSymbolClick) {
      onSymbolClick(symbol);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-default">
      {/* Days Input Control */}
      <div className="px-6 py-4 border-b border-default flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-card-foreground">History Period:</span>
          <div className="flex items-center gap-2">
            <input
              id="filled-orders-days"
              type="number"
              min="1"
              max="80"
              value={historyDays}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= 1 && value <= 80) {
                  setHistoryDays(value);
                }
              }}
              className="w-16 px-2 py-1 text-sm text-center font-medium border border-default rounded bg-card text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
          {lastFetchTime && (
            <span className="text-xs text-muted-foreground">
              Last updated: {new Date(lastFetchTime).toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchTradeHistory(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-danger-light border border-danger rounded-lg">
          <p className="text-sm text-danger-foreground">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading filled orders...</p>
          </div>
        </div>
      ) : tradeHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <FileText className="w-12 h-12 text-muted mb-4" />
          <p className="text-card-foreground font-medium mb-2">No filled orders</p>
          <p className="text-sm text-muted-foreground">Your completed trades will appear here</p>
        </div>
      ) : (
        <div className="p-6 space-y-6">{/* Group trades by symbol */}
          {/* Group trades by symbol */}
          {Object.entries(
            tradeHistory.reduce((acc, trade) => {
              if (!acc[trade.symbol]) {
                acc[trade.symbol] = [];
              }
              acc[trade.symbol].push(trade);
              return acc;
            }, {} as Record<string, TradeHistory[]>)
          )
            .sort(([, tradesA], [, tradesB]) => {
              const mostRecentA = Math.max(...tradesA.map(t => Number(t.cTime)));
              const mostRecentB = Math.max(...tradesB.map(t => Number(t.cTime)));
              return mostRecentB - mostRecentA;
            })
            .map(([symbol, trades]) => {
              const sortedTrades = [...trades].sort((a, b) => Number(a.cTime) - Number(b.cTime));
              
              const pairs: Array<{
                buys: TradeHistory[];
                sells: TradeHistory[];
                pnl: number | null;
                pnlPercent: number | null;
                avgBuyPrice: number | null;
                totalBuySize: number | null;
                totalBuyCost: number | null;
                avgSellPrice: number | null;
                totalSellSize: number | null;
                totalSellRevenue: number | null;
              }> = [];
              
              let currentBuyGroup: TradeHistory[] = [];
              let currentSellGroup: TradeHistory[] = [];
              
              for (const trade of sortedTrades) {
                if (trade.side === 'buy') {
                  if (currentBuyGroup.length > 0 && currentSellGroup.length > 0) {
                    let totalBuySize = 0;
                    let totalBuyCost = 0;
                    
                    for (const buy of currentBuyGroup) {
                      const size = parseFloat(buy.size || '0');
                      const price = parseFloat(buy.price || '0');
                      const feeDetail = buy.feeDetail;
                      
                      let effectiveBuySize = size;
                      if (feeDetail && feeDetail.feeCoin !== 'USDT') {
                        const feeInAsset = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                        effectiveBuySize = size - feeInAsset;
                      }
                      
                      totalBuySize += effectiveBuySize;
                      totalBuyCost += size * price;
                      
                      if (feeDetail && feeDetail.feeCoin === 'USDT') {
                        const fee = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                        totalBuyCost += fee;
                      }
                    }
                    
                    const avgBuyPrice = totalBuySize > 0 ? totalBuyCost / totalBuySize : 0;
                    
                    let totalSellSize = 0;
                    let totalSellRevenue = 0;
                    
                    for (const sell of currentSellGroup) {
                      const size = parseFloat(sell.size || '0');
                      const price = parseFloat(sell.price || '0');
                      totalSellSize += size;
                      totalSellRevenue += size * price;
                      
                      const feeDetail = sell.feeDetail;
                      if (feeDetail && feeDetail.feeCoin === 'USDT') {
                        const fee = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                        totalSellRevenue -= fee;
                      } else if (feeDetail && feeDetail.feeCoin !== 'USDT') {
                        const feeInAsset = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                        const feeInUSDT = feeInAsset * price;
                        totalSellRevenue -= feeInUSDT;
                      }
                    }
                    
                    const avgSellPrice = totalSellSize > 0 ? totalSellRevenue / totalSellSize : 0;
                    
                    let pnl = null;
                    let pnlPercent = null;
                    
                    if (totalBuySize > 0 && totalSellSize > 0 && avgBuyPrice > 0) {
                      const effectiveSize = Math.min(totalBuySize, totalSellSize);
                      const costBasis = effectiveSize * avgBuyPrice;
                      pnl = totalSellRevenue - costBasis;
                      pnlPercent = (pnl / costBasis) * 100;
                    }
                    
                    pairs.push({
                      buys: [...currentBuyGroup],
                      sells: [...currentSellGroup],
                      pnl,
                      pnlPercent,
                      avgBuyPrice,
                      totalBuySize,
                      totalBuyCost,
                      avgSellPrice,
                      totalSellSize,
                      totalSellRevenue
                    });
                    
                    currentBuyGroup = [];
                    currentSellGroup = [];
                  } else if (currentSellGroup.length > 0) {
                    let totalSellSize = 0;
                    let totalSellRevenue = 0;
                    
                    for (const sell of currentSellGroup) {
                      const size = parseFloat(sell.size || '0');
                      const price = parseFloat(sell.price || '0');
                      totalSellSize += size;
                      totalSellRevenue += size * price;
                      
                      const feeDetail = sell.feeDetail;
                      if (feeDetail && feeDetail.feeCoin === 'USDT') {
                        const fee = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                        totalSellRevenue -= fee;
                      } else if (feeDetail && feeDetail.feeCoin !== 'USDT') {
                        const feeInAsset = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                        const feeInUSDT = feeInAsset * price;
                        totalSellRevenue -= feeInUSDT;
                      }
                    }
                    
                    const avgSellPrice = totalSellSize > 0 ? totalSellRevenue / totalSellSize : 0;
                    
                    pairs.push({
                      buys: [],
                      sells: [...currentSellGroup],
                      pnl: null,
                      pnlPercent: null,
                      avgBuyPrice: null,
                      totalBuySize: null,
                      totalBuyCost: null,
                      avgSellPrice,
                      totalSellSize,
                      totalSellRevenue
                    });
                    
                    currentSellGroup = [];
                  }
                  
                  currentBuyGroup.push(trade);
                  
                } else if (trade.side === 'sell') {
                  currentSellGroup.push(trade);
                }
              }
              
              // Handle remaining unpaired groups
              if (currentBuyGroup.length > 0 && currentSellGroup.length > 0) {
                let totalBuySize = 0;
                let totalBuyCost = 0;
                
                for (const buy of currentBuyGroup) {
                  const size = parseFloat(buy.size || '0');
                  const price = parseFloat(buy.price || '0');
                  const feeDetail = buy.feeDetail;
                  
                  let effectiveBuySize = size;
                  if (feeDetail && feeDetail.feeCoin !== 'USDT') {
                    const feeInAsset = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                    effectiveBuySize = size - feeInAsset;
                  }
                  
                  totalBuySize += effectiveBuySize;
                  totalBuyCost += size * price;
                  
                  if (feeDetail && feeDetail.feeCoin === 'USDT') {
                    const fee = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                    totalBuyCost += fee;
                  }
                }
                
                const avgBuyPrice = totalBuySize > 0 ? totalBuyCost / totalBuySize : 0;
                
                let totalSellSize = 0;
                let totalSellRevenue = 0;
                
                for (const sell of currentSellGroup) {
                  const size = parseFloat(sell.size || '0');
                  const price = parseFloat(sell.price || '0');
                  totalSellSize += size;
                  totalSellRevenue += size * price;
                  
                  const feeDetail = sell.feeDetail;
                  if (feeDetail && feeDetail.feeCoin === 'USDT') {
                    const fee = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                    totalSellRevenue -= fee;
                  } else if (feeDetail && feeDetail.feeCoin !== 'USDT') {
                    const feeInAsset = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                    const feeInUSDT = feeInAsset * price;
                    totalSellRevenue -= feeInUSDT;
                  }
                }
                
                const avgSellPrice = totalSellSize > 0 ? totalSellRevenue / totalSellSize : 0;
                
                let pnl = null;
                let pnlPercent = null;
                
                if (totalBuySize > 0 && totalSellSize > 0 && avgBuyPrice > 0) {
                  const effectiveSize = Math.min(totalBuySize, totalSellSize);
                  const costBasis = effectiveSize * avgBuyPrice;
                  pnl = totalSellRevenue - costBasis;
                  pnlPercent = (pnl / costBasis) * 100;
                }
                
                pairs.push({
                  buys: [...currentBuyGroup],
                  sells: [...currentSellGroup],
                  pnl,
                  pnlPercent,
                  avgBuyPrice,
                  totalBuySize,
                  totalBuyCost,
                  avgSellPrice,
                  totalSellSize,
                  totalSellRevenue
                });
                
              } else if (currentBuyGroup.length > 0) {
                let totalBuySize = 0;
                let totalBuyCost = 0;
                
                for (const buy of currentBuyGroup) {
                  const size = parseFloat(buy.size || '0');
                  const price = parseFloat(buy.price || '0');
                  const feeDetail = buy.feeDetail;
                  
                  let effectiveBuySize = size;
                  if (feeDetail && feeDetail.feeCoin !== 'USDT') {
                    const feeInAsset = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                    effectiveBuySize = size - feeInAsset;
                  }
                  
                  totalBuySize += effectiveBuySize;
                  totalBuyCost += size * price;
                  
                  if (feeDetail && feeDetail.feeCoin === 'USDT') {
                    const fee = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                    totalBuyCost += fee;
                  }
                }
                
                const avgBuyPrice = totalBuySize > 0 ? totalBuyCost / totalBuySize : 0;
                
                pairs.push({
                  buys: [...currentBuyGroup],
                  sells: [],
                  pnl: null,
                  pnlPercent: null,
                  avgBuyPrice,
                  totalBuySize,
                  totalBuyCost,
                  avgSellPrice: null,
                  totalSellSize: null,
                  totalSellRevenue: null
                });
                
              } else if (currentSellGroup.length > 0) {
                let totalSellSize = 0;
                let totalSellRevenue = 0;
                
                for (const sell of currentSellGroup) {
                  const size = parseFloat(sell.size || '0');
                  const price = parseFloat(sell.price || '0');
                  totalSellSize += size;
                  totalSellRevenue += size * price;
                  
                  const feeDetail = sell.feeDetail;
                  if (feeDetail && feeDetail.feeCoin === 'USDT') {
                    const fee = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                    totalSellRevenue -= fee;
                  } else if (feeDetail && feeDetail.feeCoin !== 'USDT') {
                    const feeInAsset = Math.abs(parseFloat(feeDetail.totalFee || '0'));
                    const feeInUSDT = feeInAsset * price;
                    totalSellRevenue -= feeInUSDT;
                  }
                }
                
                const avgSellPrice = totalSellSize > 0 ? totalSellRevenue / totalSellSize : 0;
                
                pairs.push({
                  buys: [],
                  sells: [...currentSellGroup],
                  pnl: null,
                  pnlPercent: null,
                  avgBuyPrice: null,
                  totalBuySize: null,
                  totalBuyCost: null,
                  avgSellPrice,
                  totalSellSize,
                  totalSellRevenue
                });
              }
              
              pairs.reverse();

              const totalBuys = sortedTrades.filter(t => t.side === 'buy').length;
              const totalSells = sortedTrades.filter(t => t.side === 'sell').length;
              const completedPairs = pairs.filter(p => p.sells.length > 0 && p.buys.length > 0).length;
              const pendingBuys = pairs.filter(p => p.sells.length === 0 && p.buys.length > 0).length;
              const unmatchedSells = pairs.filter(p => p.sells.length > 0 && p.buys.length === 0).length;

              return (
                <div
                  key={symbol}
                  className="border border-gray-200 dark:border-gray-800 rounded-md overflow-hidden p-0"
                >
                  {/* Symbol Header */}
                  <div className="bg-gray-50 dark:bg-gray-800 px-1 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 
                          className="font-bold text-lg text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          onClick={() => handleSymbolClick(symbol)}
                        >
                          {symbol}
                        </h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {trades.length} order{trades.length !== 1 ? 's' : ''} • {totalBuys} buy{totalBuys !== 1 ? 's' : ''} • {totalSells} sell{totalSells !== 1 ? 's' : ''}
                          {completedPairs > 0 && <span className="ml-2 text-blue-600 dark:text-blue-400">• {completedPairs} completed pair{completedPairs !== 1 ? 's' : ''}</span>}
                          {pendingBuys > 0 && <span className="ml-2 text-orange-600 dark:text-orange-400">• {pendingBuys} pending position{pendingBuys !== 1 ? 's' : ''}</span>}
                          {unmatchedSells > 0 && <span className="ml-2 text-purple-600 dark:text-purple-400">• {unmatchedSells} unmatched sell{unmatchedSells !== 1 ? 's' : ''}</span>}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Paired Orders List */}
                  <div className="space-y-0 border-b-4 border-gray-300 dark:border-gray-600">
                    {pairs.map((pair, pairIndex) => (
                      <div key={pairIndex} className="bg-white dark:bg-gray-900 border-0 border-b-4 border-gray-300 dark:border-gray-600 shadow-none hover:shadow-none transition-all">
                        
                        {/* Sell Section */}
                        {pair.sells.length > 0 && (
                          <>
                            {/* Sell Header */}
                            <div className="px-4 py-2 border-gray-600 border-gray-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2.5 py-1 rounded font-semibold bg-red-600/90 text-white">
                                    SELL {pair.sells.length > 1 ? `(${pair.sells.length})` : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-8 text-sm">
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Avg Price</div>
                                    <div className="font-semibold text-gray-800 dark:text-white">${formatPrice(pair.avgSellPrice)}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Size</div>
                                    <div className="font-semibold text-gray-800 dark:text-white">{formatAmount(pair.totalSellSize)}</div>
                                  </div>
                                  <div className="text-right min-w-[110px]">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Revenue</div>
                                    <div className="font-semibold text-gray-800 dark:text-white">${formatAmount(pair.totalSellRevenue, 2)}</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Sell Orders */}
                            <div className="divide-y divide-gray-100 bg-gray-50 dark:divide-gray-800">
                              {pair.sells.sort((a, b) => Number(b.cTime) - Number(a.cTime)).map((sell, sellIndex) => (
                                <div key={`sell-${sellIndex}`} className="px-4 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                      <span className="text-red-500 dark:text-red-500">→</span>
                                      <div className="font-medium text-gray-700 dark:text-gray-300">{new Date(Number(sell.cTime)).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                      <span className="text-gray-400 dark:text-gray-500">#{String(sell.tradeId).slice(-4)}</span>
                                    </div>
                                    <div className="flex items-center gap-6 text-gray-700 dark:text-gray-300">
                                      <span className="text-right min-w-fit text-gray-700 dark:text-gray-300">${formatPrice(sell.price)}</span>
                                      <span className="text-right min-w-fit text-gray-700 dark:text-gray-300">{formatAmount(sell.size)}</span>
                                      <span className="text-right min-w-[80px] font-semibold text-red-600 dark:text-red-400">${formatAmount(sell.amount, 2)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* Separator Line */}
                        {pair.sells.length > 0 && pair.buys.length > 0 && (
                          <div className="border-t border-gray-300" />
                        )}

                        {/* Buy Section */}
                        {pair.buys.length > 0 && (
                          <>
                            {/* Buy Header */}
                            <div className="px-4 py-2 border-b border-gray-200  bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2.5 py-1 rounded font-semibold bg-green-600/90 text-white">
                                    BUY {pair.buys.length > 1 ? `(${pair.buys.length})` : ''}
                                  </span>
                                  {pair.sells.length === 0 && (
                                    <span className="text-xs px-2.5 py-1 rounded font-semibold bg-amber-600/90 text-white">
                                      PENDING
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-8 text-sm">
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Avg Price</div>
                                    <div className="font-semibold text-gray-800 dark:text-white">${formatPrice(pair.avgBuyPrice)}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Size</div>
                                    <div className="font-semibold text-gray-800 dark:text-white">{formatAmount(pair.totalBuySize)}</div>
                                  </div>
                                  <div className="text-right min-w-[110px]">
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Cost</div>
                                    <div className="font-semibold text-gray-800 dark:text-white">${formatAmount(pair.totalBuyCost, 2)}</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Buy Orders */}
                            <div className="divide-y divide-gray-100 bg-gray-50 dark:divide-gray-800">
                              {pair.buys.sort((a, b) => Number(b.cTime) - Number(a.cTime)).map((buy, buyIndex) => (
                                <div key={`buy-${buyIndex}`} className="px-4 py-1.5  hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                  <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                      <span className="text-green-500 dark:text-green-500">→</span>
                                      <div className="font-medium text-gray-700 dark:text-gray-300">{new Date(Number(buy.cTime)).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                                      <span className="text-gray-400 dark:text-gray-500">#{String(buy.tradeId).slice(-4)}</span>
                                    </div>
                                    <div className="flex items-center gap-6 text-gray-700 dark:text-gray-300">
                                      <span className="text-right min-w-fit text-gray-700 dark:text-gray-300">${formatPrice(buy.price)}</span>
                                      <span className="text-right min-w-fit text-gray-700 dark:text-gray-300">{formatAmount(buy.size)}</span>
                                      <span className="text-right min-w-[80px] font-semibold text-green-600 dark:text-green-400">${formatAmount(buy.amount, 2)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {/* PNL Section */}
                        {pair.pnl !== null && (
                          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">PNL</span>
                              <div className="flex items-center gap-3">
                                <span className={`font-semibold ${pair.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {pair.pnl >= 0 ? '+' : ''}${formatAmount(pair.pnl, 2)}
                                </span>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${pair.pnl >= 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                                  {pair.pnlPercent !== null ? `${pair.pnlPercent >= 0 ? '+' : ''}${pair.pnlPercent.toFixed(2)}%` : '-'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Unmatched Indicator */}
                        {pair.sells.length > 0 && pair.buys.length === 0 && (
                          <div className="px-4 py-1.5 border-t border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20">
                            <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">⚠️ unmatched sell</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
