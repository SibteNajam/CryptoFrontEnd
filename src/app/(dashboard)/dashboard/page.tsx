'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import SymbolCards from '../../../components/dashboard/SymbolCards';
import TradingPanel from '../../../components/charts/TradingPanel';
import BinanceOrderBook from '../../../components/dashboard/OrderBook';
import TradingViewChart from '../../../components/charts/TradingViewChart';
import { BinanceApiService } from '../../../infrastructure/api/BinanceOrder';
import TradesComponent from '@/components/dashboard/trades';
import TickerBar from '../../../components/dashboard/tickerBar';
import { useTheme } from '@/infrastructure/theme/ThemeContext';
import { useAppSelector } from '@/infrastructure/store/hooks';

interface SymbolPrice {
    symbol: string;
    price: string;
}

interface OrderBookEntry {
    price: string;
    qty: string;
}

interface OrderBookData {
    lastUpdateId: number;
    bids: OrderBookEntry[];
    asks: OrderBookEntry[];
    timestamp?: string;
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

const API_BASE_URL = 'http://localhost:3000';

export default function Dashboard() {
      const { selectedExchange, exchanges, connectionStatus } = useAppSelector((state) => state.exchange);
        const currentExchangeConfig = exchanges[selectedExchange];


    console.log('Selected Exchange in Dashboard:', selectedExchange);
    console.log('Current Exchange Config in Dashboard:', currentExchangeConfig);
    console.log('Connection Status in Dashboard:', connectionStatus);
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
    const socketRef = useRef<Socket | null>(null);
    const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);
    const [orderBookLoading, setOrderBookLoading] = useState(false);
    const [orderBookDepth, setOrderBookDepth] = useState(200);
    const [orderBookRefreshRate, setOrderBookRefreshRate] = useState<number>(3000);
    const [apiService] = useState(() => new BinanceApiService());
    const [recentOrders, setRecentOrders] = useState<any[]>([]);

// Replace the useEffect that initializes WebSocket with this:

useEffect(() => {
    console.log('🔌 Initializing WebSocket connection...');
    
    // Use environment variable or fallback to localhost:3000
    const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';
    console.log('🌐 Connecting to WebSocket URL:', WS_URL);
    
    const socket = io(WS_URL, {
        transports: ['websocket', 'polling'], // Try websocket first, fallback to polling
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 10000, // 10 second timeout
        autoConnect: true,
        // Add these options for better debugging
        upgrade: true,
        rememberUpgrade: true,
        forceNew: true,
    });
    
    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
        console.log('✅ Connected to server - Socket ID:', socket.id);
        console.log('🔗 Transport type:', socket.io.engine.transport.name);
        setError(null);
        setWsConnected(true);
        
        // Subscribe to the selected symbol
        socket.emit('subscribe_symbol_with_indicators', {
            symbol: selectedSymbol,
            interval: selectedInterval,
            limit: 1000,
        });
    });

    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        console.error('Error details:', {
            message: error.message,
        });
        
        setWsConnected(false);
        const errMsg = error.message || String(error);
        setError(`Connection error: ${errMsg}. Make sure backend is running on ${WS_URL}`);
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected from server. Reason:', reason);
        setWsConnected(false);
        
        if (reason === 'io server disconnect') {
            // Server disconnected, need to reconnect manually
            socket.connect();
        }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Reconnection attempt ${attemptNumber}...`);
    });

    socket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
        setError('Failed to reconnect to server. Please refresh the page.');
    });

    socket.on('connection_status', (data) => {
        console.log('📡 Connection status:', data);
    });

    socket.on('binance_connection_status', (data) => {
        console.log('📊 Binance connection status:', data);
        if (data.status === 'connected') {
            console.log('✅ Binance WebSocket connected');
        } else if (data.status === 'error') {
            console.error('❌ Binance connection error:', data.error);
        }
    });

    socket.on('ticker_data', (data: any) => {
        console.log('📈 Received ticker data:', {
            symbol: data.symbol,
            lastPrice: data.ticker.lastPrice,
            priceChange: data.ticker.priceChange,
            priceChangePercent: data.ticker.priceChangePercent,
        });
        
        const currentUpdateTime = performance.now();
        const updateTimestamp = new Date().toISOString();

        setTickerData(data);
    });

    socket.on('subscription_status', (data) => {
        console.log('✅ Subscription status:', data);
    });

    socket.on('subscription_error', (data) => {
        console.error('❌ Subscription error:', data);
        setError(`Error loading ${data.symbol}: ${data.error}`);
    });

    // Cleanup function
    return () => {
        console.log('🔌 Cleaning up WebSocket connection');
        socket.off('connect');
        socket.off('disconnect');
        socket.off('connect_error');
        socket.off('reconnect_attempt');
        socket.off('reconnect_failed');
        socket.off('connection_status');
        socket.off('binance_connection_status');
        socket.off('subscription_status');
        socket.off('subscription_error');
        socket.off('ticker_data');
        socket.offAny();
        socket.disconnect();
    };
}, [selectedInterval, selectedSymbol]);


    

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
            setError(null);
            const response = await fetch(`${API_BASE_URL}/binance/limit-symbols?limit=20`);
            if (!response.ok) throw new Error('Failed to fetch symbols');

            const data: SymbolPrice[] = await response.json();
            setSymbols(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch symbols');
            console.error('Error fetching symbols:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchOrderBook = async (symbol: string, limit: number = orderBookDepth) => {
        setOrderBookLoading(true);
        try {
            console.log(`🔄 Fetching order book for ${symbol} with depth ${limit}`);

            const response = await fetch(
                `${API_BASE_URL}/binance/orderBook?symbol=${symbol}&limit=${limit}`
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            const orderBookWithTimestamp: OrderBookData = {
                ...data,
                timestamp: new Date().toISOString()
            };

            setOrderBookData(orderBookWithTimestamp);
            console.log('📊 Order Book Data loaded:', {
                symbol: symbol,
                bids: orderBookWithTimestamp.bids.length,
                asks: orderBookWithTimestamp.asks.length,
                timestamp: new Date().toLocaleTimeString()
            });

        } catch (error) {
            console.error('❌ Error fetching order book:', error);
        } finally {
            setOrderBookLoading(false);
        }
    };

    useEffect(() => {
        fetchSymbols();
    }, []);

    useEffect(() => {
        if (selectedSymbol) {
            fetchOrderBook(selectedSymbol, orderBookDepth);
        }
    }, [selectedSymbol]);

    const handleSymbolClick = (symbol: string) => {
        if (symbol === selectedSymbol) return;

        setSelectedSymbol(symbol);
        setError(null);
        setLastWebSocketUpdateTime(0);
        setWebSocketUpdateHistory([]);
        setWebSocketTiming(null);
        setTickerData(null);
        if (socketRef.current && wsConnected) {
            socketRef.current.emit('subscribe_symbol_with_indicators', {
                symbol: symbol,
                interval: selectedInterval,
                limit: 1000,
            });
        }
    };

    const handleIntervalChange = (interval: string) => {
        if (interval === selectedInterval) return;

        setSelectedInterval(interval);
        setError(null);
        setLastWebSocketUpdateTime(0);
        setWebSocketUpdateHistory([]);
        setWebSocketTiming(null);
        setTickerData(null);
        if (socketRef.current && wsConnected) {
            socketRef.current.emit('subscribe_symbol_with_indicators', {
                symbol: selectedSymbol,
                interval: interval,
                limit: 1000,
            });
        }
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

            {tickerData && (
                <TickerBar
                    selectedSymbol={selectedSymbol}
                    tickerData={tickerData}
                    userBalance={undefined}
                    wsConnected={wsConnected}
                    availableSymbols={symbols}
                    onSymbolChange={handleSymbolClick}
                />
            )}

            {/* Main Trading Layout */}
            <div className="bg-muted min-h-screen">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <div className="bg-card rounded-sm border border-default shadow-sm overflow-hidden h-full">
                                <div className="border-b border-default px-6 py-3 flex items-center justify-between bg-card flex-shrink-0">
                                    <div className="flex items-center space-x-6">
                                        <h2 className="text-lg font-semibold text-primary">{selectedSymbol}</h2>
                                        <select
                                            value={selectedInterval}
                                            onChange={(e) => handleIntervalChange(e.target.value)}
                                            className="text-sm border border-light rounded-md px-3 py-1.5 text-secondary bg-card focus-ring"
                                        >
                                            <option value="1m">1m</option>
                                            <option value="5m">5m</option>
                                            <option value="15m">15m</option>
                                            <option value="1h">1h</option>
                                            <option value="4h">4h</option>
                                            <option value="1d">1D</option>
                                        </select>
                                        {tickerData && (
                                            <div className="flex items-center space-x-4">
                                                <span className="text-lg font-medium text-primary">
                                                    ${parseFloat(tickerData.ticker.lastPrice).toLocaleString()}
                                                </span>
                                                <span className={`text-sm font-medium px-2 py-1 rounded ${parseFloat(tickerData.ticker.priceChangePercent) >= 0
                                                    ? 'text-success bg-success-light'
                                                    : 'text-danger bg-danger-light'
                                                    }`}>
                                                    {parseFloat(tickerData.ticker.priceChangePercent) >= 0 ? '+' : ''}
                                                    {parseFloat(tickerData.ticker.priceChangePercent).toFixed(2)}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
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
                            {orderBookData ? (
                                <div className="h-full">
                                    <BinanceOrderBook
                                        symbol={selectedSymbol}
                                        bids={orderBookData.bids}
                                        asks={orderBookData.asks}
                                        precision={selectedSymbol.includes('BTC') ? 2 : selectedSymbol.includes('ETH') ? 2 : 4}
                                        depth={20}
                                        isLoading={orderBookLoading}
                                        lastUpdateTime={orderBookData.timestamp}
                                        onRefresh={() => fetchOrderBook(selectedSymbol, orderBookDepth)}
                                        refreshInterval={orderBookRefreshRate}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center py-8">
                                        <div className="w-8 h-8 border-2 border-light border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-muted-foreground">Loading order book...</p>
                                    </div>
                                </div>
                            )}
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