'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Clock, User, BarChart3 } from 'lucide-react';

interface TradeEntry {
    id: number;
    price: string;
    qty: string;
    quoteQty: string;
    time: number;
    isBuyerMaker: boolean;
    isBestMatch: boolean;
}

interface MyTradeEntry {
    symbol: string;
    id: number;
    orderId: number;
    orderListId: number;
    price: string;
    qty: string;
    quoteQty: string;
    commission: string;
    commissionAsset: string;
    time: number;
    isBuyer: boolean;
    isMaker: boolean;
    isBestMatch: boolean;
}

interface TradesProps {
    symbol: string;
}

export default function TradesComponent({ symbol }: TradesProps) {
    // Internal state management
    const [tradeType, setTradeType] = useState<'market' | 'my'>('market');
    const [marketTrades, setMarketTrades] = useState<TradeEntry[]>([]);
    const [myTrades, setMyTrades] = useState<MyTradeEntry[]>([]);
    const [tradesLoading, setTradesLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [timeSinceRefresh, setTimeSinceRefresh] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [isTabSwitching, setIsTabSwitching] = useState(false); // Only for tab switching
    const [isRefreshing, setIsRefreshing] = useState(false); // Separate state for refresh

    // Internal configuration
    const refreshInterval = 5000; // 5 seconds
    const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

    // Refs for timers
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
    const refreshCountdownRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch trades function
    const fetchTrades = async (isManualRefresh = false) => {
        if (!symbol) return;

        // Only show loading state for manual refresh, not auto-refresh
        if (isManualRefresh) {
            setIsRefreshing(true);
        }
        setError(null);

        try {
            if (tradeType === 'market') {
                // Fetch recent market trades - limit to 50 for better performance
                const response = await fetch(`${API_BASE_URL}/binance/trades?symbol=${symbol}&limit=50`);
                if (!response.ok) throw new Error('Failed to fetch market trades');

                const data: TradeEntry[] = await response.json();
                setMarketTrades(data);
                console.log(`📊 Fetched ${data.length} market trades for ${symbol}`);
            } else {
                // Fetch my trades
                const response = await fetch(`${API_BASE_URL}/binance/my-trades?symbol=${symbol}&limit=50`);
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Authentication required for personal trades');
                    }
                    throw new Error('Failed to fetch my trades');
                }

                const data: MyTradeEntry[] = await response.json();
                setMyTrades(data);
                console.log(`👤 Fetched ${data.length} personal trades for ${symbol}`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch trades';
            setError(errorMessage);
            console.error('❌ Error fetching trades:', error);
        } finally {
            if (isManualRefresh) {
                setIsRefreshing(false);
            }
        }
    };

    // Internal refresh logic
    const handleRefreshTrades = () => {
        fetchTrades(true); // Manual refresh
        setLastRefresh(new Date());
        setTimeSinceRefresh(0);
    };

    // Handle trade type change with animation (keep this animation)
    const handleTradeTypeChange = (newType: 'market' | 'my') => {
        if (newType === tradeType) return;

        setIsTabSwitching(true);
        setTimeout(() => {
            setTradeType(newType);
            setTimeout(() => {
                setIsTabSwitching(false);
            }, 150);
        }, 150);
    };

    // Set up auto-refresh timers
    useEffect(() => {
        // Clear existing timers
        if (refreshTimerRef.current) {
            clearInterval(refreshTimerRef.current);
        }
        if (refreshCountdownRef.current) {
            clearInterval(refreshCountdownRef.current);
        }

        // Set up auto-refresh timer (silent refresh)
        refreshTimerRef.current = setInterval(() => {
            if (!isRefreshing) {
                fetchTrades(false); // Auto refresh - no loading state
                setLastRefresh(new Date());
                setTimeSinceRefresh(0);
            }
        }, refreshInterval);

        // Set up countdown timer
        refreshCountdownRef.current = setInterval(() => {
            setTimeSinceRefresh(prev => prev + 100);
        }, 100);

        return () => {
            if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
            if (refreshCountdownRef.current) clearInterval(refreshCountdownRef.current);
        };
    }, [symbol, tradeType, isRefreshing]);

    // Fetch trades when symbol or trade type changes
    useEffect(() => {
        if (symbol) {
            setTimeSinceRefresh(0);
            fetchTrades(true); // Initial fetch with loading
        }
    }, [symbol, tradeType]);

    // Process trades with limited display count
    const processedTrades = useMemo(() => {
        const trades = tradeType === 'market' ? marketTrades : myTrades;
        return trades
            .sort((a, b) => b.time - a.time) // Most recent first
            .slice(0, 25); // Limit to 25 trades to fit in the available space
    }, [marketTrades, myTrades, tradeType]);

    // Format number with specified precision
    const formatNumber = (num: number, places: number = 2) => {
        return num.toLocaleString(undefined, {
            minimumFractionDigits: places,
            maximumFractionDigits: places,
        });
    };

    // Format time like Binance (HH:MM:SS)
    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Calculate refresh progress
    const refreshProgress = Math.min(100, (timeSinceRefresh / refreshInterval) * 100);

    // Get base asset from symbol (e.g., BTCUSDT -> BTC)
    const getBaseAsset = (symbol: string) => {
        return symbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '');
    };

    return (
        <div className="bg-card rounded-sm border border-gray-200 shadow-sm overflow-hidden flex flex-col" style={{ height: '580px' }}>
            {/* Header - Fixed height to match chart header */}
            <div className="border-b border-gray-200 px-3 py-3 flex-shrink-0 bg-card" style={{ minHeight: '73px' }}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                        Trades <span className="text-blue-600 font-bold">{symbol}</span>
                    </h3>
                </div>

                {/* Trade Type Toggle */}
                <div className="flex rounded-lg p-1 border border-primary-light">
                    <button
                        onClick={() => handleTradeTypeChange('market')}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all duration-300 ease-out transform ${tradeType === 'market'
                                ? 'bg-primary text-primary-foreground shadow-md scale-105'
                                : 'text-primary hover:text-primary-dark hover:bg-primary-hover'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-1.5">
                            <BarChart3 size={12} />
                            <span>Market Trades</span>
                        </div>
                    </button>
                    <button
                        onClick={() => handleTradeTypeChange('my')}
                        className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all duration-300 ease-out transform ${tradeType === 'my'
                                ? 'bg-primary text-primary-foreground shadow-md scale-105'
                                : 'text-primary hover:text-primary-dark hover:bg-primary-hover'
                            }`}
                    >
                        <div className="flex items-center justify-center gap-1.5">
                            <User size={12} />
                            <span>My Trades</span>
                        </div>
                    </button>
                </div>
                {/* Error Display */}
                {error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
                        {error}
                    </div>
                )}
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-3 text-xs font-medium text-gray-500 px-3 py-2 bg-gradient-gray flex-shrink-0 border-b border-gray-100">
                <div className="text-left">Price (USDT)</div>
                <div className="text-right">Amount ({getBaseAsset(symbol)})</div>
                <div className="text-right flex items-center justify-end gap-1">
                    <Clock size={10} />
                    Time
                </div>
            </div>

            {/* Trades List - Only animate during tab switching, not refresh */}
            <div className={`flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden transition-all duration-300 ease-out ${isTabSwitching ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                }`} style={{ maxHeight: '460px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {processedTrades.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center py-8">
                            {(isRefreshing || (tradeType === 'market' ? marketTrades.length === 0 : myTrades.length === 0)) && !error ? (
                                <>
                                    <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
                                    <p className="text-blue-600 text-sm font-medium">Loading trades...</p>
                                </>
                            ) : error ? (
                                <>
                                    <TrendingDown className="h-8 w-8 text-red-400 mx-auto mb-3" />
                                    <p className="text-red-500 text-sm font-medium">Failed to load trades</p>
                                </>
                            ) : (
                                <>
                                    <BarChart3 className="h-8 w-8 text-blue-300 mx-auto mb-3" />
                                    <p className="text-blue-500 text-sm font-medium">No trades found</p>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {processedTrades.map((trade, index) => {
                            const isBuy = tradeType === 'market'
                                ? !(trade as TradeEntry).isBuyerMaker
                                : (trade as MyTradeEntry).isBuyer;
                            const price = parseFloat(trade.price);
                            const quantity = parseFloat(trade.qty);

                            return (
                                <div
                                    key={`${trade.id}-${trade.time}-${index}`}
                                    className={`grid grid-cols-3 text-xs py-2.5 px-3 transition-colors duration-200 ease-out hover:scale-[1.01] hover:shadow-sm ${isBuy
                                            ? 'hover-bg-gradient-green hover-border-l-green'
                                            : 'hover-bg-gradient-red hover-border-l-red'
                                        }`}
                                >
                                    {/* Price */}
                                    <div className={`text-left font-semibold transition-colors duration-200 ${isBuy ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {formatNumber(price, symbol.includes('BTC') ? 2 : 4)}
                                    </div>

                                    {/* Quantity */}
                                    <div className="text-right font-medium text-gray-900">
                                        {formatNumber(quantity, 6)}
                                    </div>

                                    {/* Time */}
                                    <div className="text-right text-blue-600 font-mono text-xs font-medium">
                                        {formatTime(trade.time)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-gray-200 bg-gradient-blue text-xs text-gray-600 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-green-500 rounded-full shadow-sm"></span>
                        <span className="font-medium">Buy</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-red-500 rounded-full shadow-sm"></span>
                        <span className="font-medium">Sell</span>
                    </div>
                </div>
                <span className="text-blue-600 font-semibold">
                    {processedTrades.length} {tradeType === 'market' ? 'Market' : 'My'} Trades
                </span>
            </div>
        </div>
    );
}