'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import useMarketTicker from '@/hooks/useMarketTicker';
import SymbolCards from '../../../components/dashboard/SymbolCards';
import TradingPanel from '../../../components/charts/TradingPanel';
import BinanceOrderBook from '../../../components/dashboard/OrderBook';
import TradingViewChart from '../../../components/charts/TradingViewChart';
import { BinanceApiService } from '../../../infrastructure/api/BinanceOrder';
import TradesComponent from '@/components/dashboard/trades';
// import TickerBar from '../../../components/dashboard/tickerBar';
import ExchangeTickerBar from '../../../components/dashboard/ExchangeTickerBar';
import { useTheme } from '@/infrastructure/theme/ThemeContext';
import { useAppSelector, useAppDispatch } from '@/infrastructure/store/hooks';

interface SymbolPrice {
    symbol: string;
    price: string;
}

interface RestPriceData {
    symbol: string;
    currentPrice: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    highPrice24h: number;
    lowPrice24h: number;
    lastUpdateTime: string;
    volume24h: number;
    volumeUSDT: number;
}

interface PriceComparison {
    websocket: number;
    rest: number;
    difference: number;
    percentageDiff: number;
    lastUpdated: {
        websocket: string;
        rest: string;
    };
}

interface RestLatencyData {
    requestStartTime: number;
    responseEndTime: number;
    totalLatency: number;
    networkLatency: number;
    requestTimestamp: string;
}

interface WebSocketTimingData {
    previousUpdateTime: number;
    currentUpdateTime: number;
    intervalBetweenUpdates: number;
    updateTimestamp: string;
    price: string;
    priceChange: string;
}

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

const API_BASE_URL = 'http://146.59.93.94:3000';

export default function Dashboard() {
    const { selectedExchange } = useAppSelector((state) => state.exchange);

    console.log('Selected Exchange in Dashboard:', selectedExchange);
    const { theme } = useTheme();
    const [symbols, setSymbols] = useState<SymbolPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
    const [selectedInterval, setSelectedInterval] = useState<string>('1m');
    const [wsConnected, setWsConnected] = useState(false);
    const [tickerData, setTickerData] = useState<BinanceTickerData | null>(null);
    const [tickerUpdateCount, setTickerUpdateCount] = useState(0);
    const [restPriceData, setRestPriceData] = useState<RestPriceData | null>(null);
    const [restPollCount, setRestPollCount] = useState(0);
    const [restPollingActive, setRestPollingActive] = useState(false);
    const [restPollingInterval, setRestPollingInterval] = useState(2000);
    const [isRequestPending, setIsRequestPending] = useState(false);
    const [webSocketTiming, setWebSocketTiming] = useState<WebSocketTimingData | null>(null);
    const [priceComparison, setPriceComparison] = useState<PriceComparison | null>(null);
    const [lastWebSocketUpdateTime, setLastWebSocketUpdateTime] = useState<number>(0);
    const [webSocketUpdateHistory, setWebSocketUpdateHistory] = useState<WebSocketTimingData[]>([]);
    // socketRef removed — useMarketTicker hook manages connections
    const [apiService] = useState(() => new BinanceApiService());
    const [recentOrders, setRecentOrders] = useState<any[]>([]);

// Replace the useEffect that initializes WebSocket with this:

    // Use centralized market ticker hook which manages Binance socket.io or Bitget SSE
    const dispatch = useAppDispatch();
    const { tickerData: marketTickerData, wsConnected: marketWsConnected, connectionStatus: marketConnectionStatus, subscribeSymbol } = useMarketTicker(selectedExchange as any, selectedSymbol, selectedInterval);

    // mirror hook state into local state
    useEffect(() => {
        setTickerData(marketTickerData as any);
    }, [marketTickerData]);

    useEffect(() => {
        setWsConnected(marketWsConnected);
    }, [marketWsConnected]);

    // When symbol or interval changes locally, inform hook
    useEffect(() => {
        if (selectedSymbol) {
            // subscribeSymbol(selectedSymbol, selectedInterval);
        }
    }, [selectedSymbol, selectedInterval, subscribeSymbol]);

    // Connection status is now managed locally in useExchange hook, no need to sync to Redux

    

    const useRestPricePolling = (symbol: string, interval: number, active: boolean) => {
        const intervalRef = useRef<NodeJS.Timeout | null>(null);

        const fetchRestPrice = async () => {
            if (isRequestPending) {
                console.warn('⚠️ Previous REST request still pending, skipping...');
                return null;
            }

            setIsRequestPending(true);

            const requestStart = performance.now();
            const requestTimestamp = new Date().toISOString();

            try {
                console.log(`🔄 [${new Date().toLocaleTimeString()}] REST Request started for ${symbol}`);

                const response = await fetch(
                    `${API_BASE_URL}/binance/getCoinInfo?symbol=${symbol}`
                );

                const networkEnd = performance.now();
                const networkLatency = networkEnd - requestStart;

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data: RestPriceData = await response.json();

                const responseEnd = performance.now();
                const totalLatency = responseEnd - requestStart;
                console.log('💰 REST Response completed:', {
                    symbol: data.symbol,
                    price: data.currentPrice,
                    totalLatency: `${totalLatency.toFixed(2)}ms`,
                    networkLatency: `${networkLatency.toFixed(2)}ms`,
                    timestamp: new Date().toLocaleTimeString()
                });

                setRestPriceData(data);
                setRestPollCount(prev => prev + 1);

                return data;

            } catch (error) {
                const errorEnd = performance.now();
                const errorLatency = errorEnd - requestStart;

                console.error('❌ REST Error:', {
                    error: error instanceof Error ? error.message : String(error),
                    errorLatency: `${errorLatency.toFixed(2)}ms`,
                    timestamp: new Date().toLocaleTimeString()
                });

                return null;
            } finally {
                setIsRequestPending(false);
            }
        };

        useEffect(() => {
            if (!active) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                setIsRequestPending(false);
                return;
            }

            fetchRestPrice();

            intervalRef.current = setInterval(() => {
                if (!isRequestPending) {
                    fetchRestPrice();
                } else {
                    console.warn('⏳ Skipping REST request - previous request still pending');
                }
            }, interval);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                setIsRequestPending(false);
            };
        }, [symbol, interval, active]);

        return { fetchRestPrice };
    };

    useEffect(() => {
        if (tickerData && restPriceData && tickerData.symbol === restPriceData.symbol) {
            const wsPrice = parseFloat(tickerData.ticker.lastPrice);
            const restPrice = restPriceData.currentPrice;
            const difference = wsPrice - restPrice;
            const percentageDiff = ((difference / restPrice) * 100);

            setPriceComparison({
                websocket: wsPrice,
                rest: restPrice,
                difference: difference,
                percentageDiff: percentageDiff,
                lastUpdated: {
                    websocket: new Date().toISOString(),
                    rest: restPriceData.lastUpdateTime
                }
            });

            console.log('📊 Price Comparison:', {
                websocket: wsPrice,
                rest: restPrice,
                difference: difference.toFixed(8),
                percentageDiff: percentageDiff.toFixed(6) + '%'
            });
        }
    }, [tickerData, restPriceData]);

    const { fetchRestPrice } = useRestPricePolling(
        selectedSymbol,
        restPollingInterval,
        restPollingActive
    );

     const fetchSymbols = async () => {
       try {
            //call getSymbolsWithPrices
            console.log('🔄 Fetching symbols with prices...');
            const data = await apiService.getSymbolsWithPrice(1000);
            setSymbols(data);
            console.log('fetched data',data);
        } catch (err: any) {
            setError(err.message || "Failed to fetch symbols");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSymbols();
    }, []);

    const handleSymbolClick = (symbol: string) => {
        if (symbol === selectedSymbol) return;

        setSelectedSymbol(symbol);
        setError(null);
        setLastWebSocketUpdateTime(0);
        setWebSocketUpdateHistory([]);
        setWebSocketTiming(null);
        setTickerData(null);
        // Inform market hook to subscribe
        // subscribeSymbol(symbol, selectedInterval);
    };

    const handleIntervalChange = (interval: string) => {
        if (interval === selectedInterval) return;

        setSelectedInterval(interval);
        setError(null);
        setLastWebSocketUpdateTime(0);
        setWebSocketUpdateHistory([]);
        setWebSocketTiming(null);
        setTickerData(null);
        // Inform market hook to change interval
        // subscribeSymbol(selectedSymbol, interval);
    };

    const averageWebSocketInterval = webSocketUpdateHistory.length > 0
        ? webSocketUpdateHistory.reduce((sum, update) => sum + update.intervalBetweenUpdates, 0) / webSocketUpdateHistory.length
        : 0;

    return (
        <div className="space-y-1">
            {/* Status Bar */}
            <div className="flex items-center justify-between bg-card px-1 shadow-sm">
                <div className="flex items-center space-x-4">
                    <div className="inline-flex items-center gap-4 px-3 py-1 rounded-full text-xs bg-card text-info">
                        <span>📊 Updates: {tickerUpdateCount}</span>
                        {tickerData && (
                            <span>| Last: {new Date().toLocaleTimeString()}</span>
                        )}
                        {webSocketTiming && (
                            <span className="text-success">
                                | 🔴 WS: {webSocketTiming.intervalBetweenUpdates.toFixed(0)}ms
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="p-4 bg-danger-light border border-danger rounded-xl text-danger-foreground shadow-sm">
                    <p className="font-medium">{error}</p>
                </div>
            )}

            {/* {tickerData && (
                <TickerBar
                    selectedSymbol={selectedSymbol}
                    tickerData={tickerData}
                    userBalance={undefined}
                    wsConnected={wsConnected}
                    availableSymbols={symbols}
                    onSymbolChange={handleSymbolClick}
                />
            )} */}

            {/* New Exchange-Agnostic Ticker Bar */}
            <ExchangeTickerBar
                symbol={selectedSymbol}
                onSymbolClick={handleSymbolClick}
            />

            {/* Main Trading Layout */}
            <div className="bg-muted min-h-screen">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <div className="bg-card rounded-sm border border-default shadow-sm overflow-hidden h-full">
                                <div className="bg-card flex-1" style={{ height: '500px' }}>
                                    <TradingViewChart
                                        symbol={`BINANCE:${selectedSymbol}`}
                                        interval={selectedInterval}
                                        theme={theme}
                                        height="500px"
                                        width="100%"
                                        enableTrading={false}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1">
                            <BinanceOrderBook symbol={selectedSymbol} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <div className="bg-card rounded-sm border border-default shadow-sm" style={{ height: '580px' }}>
                                <div className="p-3 h-full overflow-hidden">
                                    <TradingPanel
                                        selectedSymbol={selectedSymbol}
                                        apiService={apiService}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1">
                            <TradesComponent symbol={selectedSymbol} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}