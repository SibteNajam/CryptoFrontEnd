'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { io, Socket } from 'socket.io-client';
import DashboardLayout from '../../components/layout/DashBoardLayout';
import SymbolCards from '../../components/dashboard/SymbolCards';
import TradingPanel from '../../components/charts/TradingPanel';
import BinanceOrderBook from '../../components/dashboard/OrderBook';
import TradingViewChart from '../../components/charts/TradingViewChart';
import { BinanceApiService } from '../../api/BinanceOrder';
import PriceClickHandler from '../../components/charts/priceClickHandler';

// Types
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

interface BinanceKlineData {
    symbol: string;
    kline: {
        t: number;
        T: number;
        s: string;
        i: string;
        f: number;
        L: number;
        o: string;
        c: string;
        h: string;
        l: string;
        v: string;
        n: number;
        x: boolean;
        q: string;
        V: string;
        Q: string;
    };
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

interface HistoricalKlines {
    symbol: string;
    interval: string;
    data: Array<[
        number, // Open time
        string, // Open price
        string, // High price
        string, // Low price
        string, // Close price
        string, // Volume
        number, // Close time
        string, // Quote asset volume
        number, // Number of trades
        string, // Taker buy base asset volume
        string, // Taker buy quote asset volume
        string  // Ignore
    ]>;
    timestamp: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export default function Dashboard() {
    // State variables
    const [symbols, setSymbols] = useState<SymbolPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const [selectedSymbol, setSelectedSymbol] = useState<string>('BTCUSDT');
    const [selectedInterval, setSelectedInterval] = useState<string>('1m');
    const [wsConnected, setWsConnected] = useState(false);
    const [tickerData, setTickerData] = useState<BinanceTickerData | null>(null);
    const [klineData, setKlineData] = useState<BinanceKlineData | null>(null);
    const [tickerUpdateCount, setTickerUpdateCount] = useState(0);

    const [restPriceData, setRestPriceData] = useState<RestPriceData | null>(null);
    const [restPollCount, setRestPollCount] = useState(0);
    const [restPollingActive, setRestPollingActive] = useState(false);
    const [priceComparison, setPriceComparison] = useState<PriceComparison | null>(null);
    const [restPollingInterval, setRestPollingInterval] = useState(2000);

    // Latency tracking states
    const [restLatency, setRestLatency] = useState<RestLatencyData | null>(null);
    const [isRequestPending, setIsRequestPending] = useState(false);

    // WebSocket timing states
    const [webSocketTiming, setWebSocketTiming] = useState<WebSocketTimingData | null>(null);
    const [lastWebSocketUpdateTime, setLastWebSocketUpdateTime] = useState<number>(0);
    const [webSocketUpdateHistory, setWebSocketUpdateHistory] = useState<WebSocketTimingData[]>([]);

    // Chart refs
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const socketRef = useRef<Socket | null>(null);

    // Order book states
    const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);
    const [orderBookLoading, setOrderBookLoading] = useState(false);
    const [orderBookDepth, setOrderBookDepth] = useState(200);
    const [orderBookRefreshRate, setOrderBookRefreshRate] = useState<number>(3000);
 const [apiService] = useState(() => new BinanceApiService());
    const [recentOrders, setRecentOrders] = useState<any[]>([]);



  const handleOrderFromChart = async (chartOrderData: any) => {
        try {
            const order = apiService.formatTradingViewOrder(chartOrderData, selectedSymbol);

            console.log('📊 Order from chart:', order);

            const confirmed = window.confirm(
                `Place ${order.side} order for ${order.quantity} ${order.symbol} ${
                    order.type === 'LIMIT' ? `at $${order.price}` : 'at MARKET price'
                }?`
            );

            if (confirmed) {
                const result = await apiService.placeOrder(order);
                setRecentOrders(prev => [result, ...prev.slice(0, 9)]);
                alert(`Order placed successfully! Order ID: ${result.orderId}`);
            }

        } catch (error) {
            console.error('Order placement failed:', error);
            alert(`Order failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    // Initialize WebSocket connection
    useEffect(() => {
        const socket = io('http://localhost:3000', {
            transports: ['websocket'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to server');
            setWsConnected(true);
            setChartLoading(true);
            setLastWebSocketUpdateTime(0);
            setWebSocketUpdateHistory([]);
            socket.emit('subscribe_symbol', {
                symbol: selectedSymbol,
                interval: selectedInterval,
                loadHistorical: true
            });
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            setWsConnected(false);
        });

        socket.on('connection_status', (data) => {
            console.log('Connection status:', data);
        });

        socket.on('binance_connection_status', (data) => {
            console.log('Binance connection status:', data);
        });

        socket.on('historical_candles', (data: HistoricalKlines) => {
            console.log('📊 Received historical klines:', data);
            setChartLoading(false);
            loadHistoricalDataToChart(data);
        });

        socket.on('kline_data', (data: BinanceKlineData) => {
            console.log('🔴 Received live kline data:', data);
            setKlineData(data);
            updateChartWithKline(data);
        });

        socket.on('ticker_data', (data: BinanceTickerData) => {
            const currentUpdateTime = performance.now();
            const updateTimestamp = new Date().toISOString();

            let intervalBetweenUpdates = 0;
            let timingData: WebSocketTimingData | null = null;

            if (lastWebSocketUpdateTime > 0) {
                intervalBetweenUpdates = currentUpdateTime - lastWebSocketUpdateTime;

                timingData = {
                    previousUpdateTime: lastWebSocketUpdateTime,
                    currentUpdateTime,
                    intervalBetweenUpdates,
                    updateTimestamp,
                    price: data.ticker.lastPrice,
                    priceChange: data.ticker.priceChangePercent
                };

                setWebSocketTiming(timingData);

                setWebSocketUpdateHistory(prev => {
                    const newHistory = [...prev.slice(-9), timingData!];
                    return newHistory;
                });

                console.log('📈 WebSocket Ticker Update with Timing:', {
                    symbol: data.symbol,
                    price: data.ticker.lastPrice,
                    change: data.ticker.priceChangePercent,
                    intervalSinceLastUpdate: `${intervalBetweenUpdates.toFixed(2)}ms`,
                    timestamp: new Date().toLocaleTimeString()
                });
            } else {
                console.log('📈 WebSocket First Ticker Update:', {
                    symbol: data.symbol,
                    price: data.ticker.lastPrice,
                    change: data.ticker.priceChangePercent,
                    note: 'First update - no interval calculated',
                    timestamp: new Date().toLocaleTimeString()
                });
            }

            setLastWebSocketUpdateTime(currentUpdateTime);
            setTickerData(data);
            setTickerUpdateCount(prev => prev + 1);
        });

        socket.on('subscription_status', (data) => {
            console.log('✅ Subscription status:', data);
        });

        socket.on('subscription_error', (data) => {
            console.error('❌ Subscription error:', data);
            setChartLoading(false);
            setError(`Error loading ${data.symbol}: ${data.error}`);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // REST polling function
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

                const latencyData: RestLatencyData = {
                    requestStartTime: requestStart,
                    responseEndTime: responseEnd,
                    totalLatency,
                    networkLatency,
                    requestTimestamp
                };

                console.log('💰 REST Response completed:', {
                    symbol: data.symbol,
                    price: data.currentPrice,
                    totalLatency: `${totalLatency.toFixed(2)}ms`,
                    networkLatency: `${networkLatency.toFixed(2)}ms`,
                    timestamp: new Date().toLocaleTimeString()
                });

                setRestPriceData(data);
                setRestPollCount(prev => prev + 1);
                setRestLatency(latencyData);

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

    // Price comparison calculator
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

    // Add the polling hook
    const { fetchRestPrice } = useRestPricePolling(
        selectedSymbol,
        restPollingInterval,
        restPollingActive
    );

    // Initialize chart
    useEffect(() => {
        if (chartContainerRef.current && !chartRef.current) {
            console.log('🎨 Initializing chart...');
            console.log('Container dimensions:', {
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight
            });

            const chart = createChart(chartContainerRef.current, {
                layout: {
                    background: { type: ColorType.Solid, color: '#ffffff' },
                    textColor: '#1e293b',
                },
                grid: {
                    vertLines: { color: '#e2e8f0' },
                    horzLines: { color: '#e2e8f0' },
                },
                crosshair: {
                    mode: 1,
                },
                rightPriceScale: {
                    borderColor: '#e2e8f0',
                },
                timeScale: {
                    borderColor: '#e2e8f0',
                    timeVisible: true,
                    secondsVisible: false,
                },
                width: chartContainerRef.current.clientWidth || 800,
                height: 400,
            });

            const candlestickSeries = chart.addCandlestickSeries({
                upColor: '#10b981',
                downColor: '#ef4444',
                borderDownColor: '#ef4444',
                borderUpColor: '#10b981',
                wickDownColor: '#ef4444',
                wickUpColor: '#10b981',
            });

            chartRef.current = chart;
            candlestickSeriesRef.current = candlestickSeries;

            console.log('✅ Chart initialized successfully');

            const handleResize = () => {
                if (chartContainerRef.current && chartRef.current) {
                    const newWidth = chartContainerRef.current.clientWidth;
                    console.log('📏 Resizing chart to width:', newWidth);
                    chartRef.current.applyOptions({
                        width: newWidth,
                    });
                }
            };

            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    // Load historical data to chart
    const loadHistoricalDataToChart = (data: HistoricalKlines) => {
        if (candlestickSeriesRef.current) {
            const candlestickData: CandlestickData[] = data.data.map(kline => ({
                time: (kline[0] / 1000) as Time,
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
            }));

            candlestickSeriesRef.current.setData(candlestickData);
            console.log(`📊 Loaded ${candlestickData.length} historical candles for ${data.symbol}`);
        }
    };

    // Update chart with kline
    const updateChartWithKline = (data: BinanceKlineData) => {
        if (candlestickSeriesRef.current) {
            const candle: CandlestickData = {
                time: (data.kline.t / 1000) as Time,
                open: parseFloat(data.kline.o),
                high: parseFloat(data.kline.h),
                low: parseFloat(data.kline.l),
                close: parseFloat(data.kline.c),
            };

            candlestickSeriesRef.current.update(candle);

            if (data.kline.x) {
                console.log(`✅ Candle closed for ${data.symbol} at ${new Date(data.kline.T).toLocaleString()}`);
            } else {
                console.log(`🟡 Candle forming for ${data.symbol} - Close: $${data.kline.c}`);
            }
        }
    };

    // Fetch symbols
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

    // Handle manual refresh
    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchSymbols();
        setTimeout(() => setRefreshing(false), 500);
    };

    // Fetch order book data
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

    // Initialize data
    useEffect(() => {
        fetchSymbols();
        setChartLoading(true);
    }, []);

    // Fetch order book when symbol changes
    useEffect(() => {
        if (selectedSymbol) {
            fetchOrderBook(selectedSymbol, orderBookDepth);
        }
    }, [selectedSymbol]);

    // Handle symbol click
    const handleSymbolClick = (symbol: string) => {
        if (symbol === selectedSymbol) return;

        setSelectedSymbol(symbol);
        setChartLoading(true);
        setError(null);

        setLastWebSocketUpdateTime(0);
        setWebSocketUpdateHistory([]);
        setWebSocketTiming(null);

        fetchOrderBook(symbol, orderBookDepth);

        if (socketRef.current && wsConnected) {
            socketRef.current.emit('subscribe_symbol', {
                symbol: symbol,
                interval: selectedInterval,
                loadHistorical: true
            });
        }
    };

    // Handle interval change
    const handleIntervalChange = (interval: string) => {
        if (interval === selectedInterval) return;

        setSelectedInterval(interval);
        setChartLoading(true);
        setError(null);

        setLastWebSocketUpdateTime(0);
        setWebSocketUpdateHistory([]);
        setWebSocketTiming(null);

        if (socketRef.current && wsConnected) {
            socketRef.current.emit('subscribe_symbol', {
                symbol: selectedSymbol,
                interval: interval,
                loadHistorical: true
            });
        }
    };

    // Calculate average WebSocket interval
    const averageWebSocketInterval = webSocketUpdateHistory.length > 0
        ? webSocketUpdateHistory.reduce((sum, update) => sum + update.intervalBetweenUpdates, 0) / webSocketUpdateHistory.length
        : 0;

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6">
                {/* Status Bar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                                }`}></div>
                            {wsConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
                        </div>

                        {/* Ticker Updates Display */}
                        <div className="inline-flex items-center gap-4 px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                            <span>📊 Updates: {tickerUpdateCount}</span>
                            {tickerData && (
                                <span>| Last: {new Date().toLocaleTimeString()}</span>
                            )}
                            {webSocketTiming && (
                                <span className="text-green-700">
                                    | 🔴 WS: {webSocketTiming.intervalBetweenUpdates.toFixed(0)}ms
                                </span>
                            )}
                            {restLatency && (
                                <span className="text-orange-700">
                                    | 📡 REST: {restLatency.totalLatency.toFixed(0)}ms
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || loading}
                        className={`
                            flex items-center gap-2 px-4 py-2 bg-white text-gray-800 border border-gray-300 
                            rounded-lg text-sm font-medium shadow-sm transition-all duration-200
                            ${refreshing || loading
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:border-blue-400 hover:shadow-md hover:bg-blue-50'
                            }
                        `}
                    >
                        <RefreshCw
                            size={16}
                            className={`transition-transform duration-300 ${refreshing ? 'animate-spin' : ''}`}
                        />
                        <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 shadow-sm">
                        <p className="font-medium">{error}</p>
                    </div>
                )}

                {/* Symbol Cards */}
                <SymbolCards
                    symbols={symbols}
                    loading={loading}
                    selectedSymbol={selectedSymbol}
                    onSymbolClick={handleSymbolClick}
                    hoveredCard={hoveredCard}
                    onCardHover={setHoveredCard}
                />

                {/* REST Controls */}
                <div className="flex justify-center">
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <button
                            onClick={() => setRestPollingActive(!restPollingActive)}
                            disabled={isRequestPending}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${restPollingActive ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
                                } ${isRequestPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {restPollingActive ? '🟢 REST ON' : '⭕ REST OFF'}
                            {isRequestPending && ' ⏳'}
                        </button>

                        <select
                            value={restPollingInterval}
                            onChange={(e) => setRestPollingInterval(Number(e.target.value))}
                            className="px-2 py-1 border border-gray-300 rounded text-xs"
                            disabled={restPollingActive}
                        >
                            <option value={100}>100ms ⚠️</option>
                            <option value={500}>500ms ⚠️</option>
                            <option value={1000}>1s ✅</option>
                            <option value={3000}>3s ✅</option>
                            <option value={5000}>5s ✅</option>
                        </select>

                        <span className="text-xs text-gray-600">
                            Calls: {restPollCount}
                        </span>

                        {restLatency && (
                            <span className="text-xs text-orange-600">
                                Last: {restLatency.totalLatency.toFixed(0)}ms
                            </span>
                        )}
                    </div>
                </div>

                {/* Performance Analysis Panel */}
                {(restLatency || webSocketTiming) && (
                    <div className="bg-gradient-to-r from-blue-50 to-orange-50 rounded-xl border border-blue-200 p-6">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">
                            ⚡ Real-time Performance Analysis
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div className="bg-white p-3 rounded-lg border">
                                <span className="text-blue-600 font-medium">WebSocket Interval:</span>
                                <div className="font-mono font-bold text-blue-700">
                                    {webSocketTiming ? `${webSocketTiming.intervalBetweenUpdates.toFixed(2)}ms` : 'No data'}
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border">
                                <span className="text-orange-600 font-medium">REST Latency:</span>
                                <div className="font-mono font-bold text-orange-700">
                                    {restLatency ? `${restLatency.totalLatency.toFixed(2)}ms` : 'No data'}
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border">
                                <span className="text-green-600 font-medium">Avg WS Interval:</span>
                                <div className="font-mono font-bold text-green-700">
                                    {averageWebSocketInterval > 0 ? `${averageWebSocketInterval.toFixed(2)}ms` : 'No data'}
                                </div>
                            </div>

                            <div className="bg-white p-3 rounded-lg border">
                                <span className="text-purple-600 font-medium">Performance:</span>
                                <div className="font-mono font-bold text-purple-700">
                                    {webSocketTiming && restLatency
                                        ? (restLatency.totalLatency < webSocketTiming.intervalBetweenUpdates ? 'REST Faster' : 'WS Efficient')
                                        : 'Calculating...'
                                    }
                                </div>
                            </div>
                        </div>

                        {webSocketUpdateHistory.length > 0 && (
                            <div className="mt-4 text-sm text-gray-600">
                                <span className="font-medium">Recent WS Updates: </span>
                                {webSocketUpdateHistory.slice(-5).map((update, index) => (
                                    <span key={index} className="font-mono text-blue-600">
                                        {update.intervalBetweenUpdates.toFixed(0)}ms
                                        {index < webSocketUpdateHistory.slice(-5).length - 1 ? ', ' : ''}
                                    </span>
                                ))}
                            </div>
                        )}

                        <div className="mt-2 text-sm text-gray-500">
                            Last updated: {new Date().toLocaleTimeString()}
                        </div>
                    </div>
                )}
                <div className="flex-1 p-4">
                     <div className="flex-1 p-4">

                    <TradingViewChart
                        symbol={`BINANCE:${selectedSymbol}`}
                        interval={selectedInterval}
                        theme="light" // ✅ Set to light theme
                        height="600px"
                        enableTrading={true} // ✅ Enable trading features
                        onOrderPlace={handleOrderFromChart}
                        />
                        </div>
                      {/* Right Side - Trading Panel */}
           <div className="w-80 bg-gray-50 p-4 border-l overflow-y-auto">
                <div className="space-y-4">
                    <TradingPanel 
                        selectedSymbol={selectedSymbol}
                        apiService={apiService}
                    />
                    
                    <PriceClickHandler 
                        selectedSymbol={selectedSymbol}
                        apiService={apiService}
                    />
                </div>
            </div>
                </div>
                 

            
                    {/* Chart Container */}
                    {/* <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">
                                {selectedSymbol} - {selectedInterval} Candlestick Chart
                            </h3>
                            {chartLoading && (
                                <div className="flex items-center gap-2 text-sm text-blue-600">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Loading chart data...</span>
                                </div>
                            )}
                        </div>
                        <div
                            ref={chartContainerRef}
                            className={`w-full h-96 border border-gray-200 rounded-lg relative ${chartLoading ? 'opacity-50' : ''
                                }`}
                        >
                            {chartLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Loader2 size={24} className="animate-spin" />
                                        <span>Loading historical data...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div> */}
                      {/* Trading Panel */}
            
                    <div>.</div>

                    {/* Order Book */}
                    <div className="mt-6">
                        <div className="mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                Order Book
                            </h3>
                            <p className="text-sm text-gray-600">
                                Professional depth chart showing real-time market orders
                            </p>
                        </div>

                        {orderBookData ? (
                            <div>
                                <div className="mb-4 flex justify-between items-center">
                                    <h4 className="text-md font-semibold text-gray-800">
                                        Market Depth
                                    </h4>

                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">Auto-refresh:</span>
                                        <select
                                            value={orderBookRefreshRate}
                                            onChange={(e) => setOrderBookRefreshRate(Number(e.target.value))}
                                            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                                        >
                                            <option value={1000}>1s (High CPU)</option>
                                            <option value={3000}>3s</option>
                                            <option value={5000}>5s</option>
                                            <option value={10000}>10s</option>
                                            <option value={30000}>30s</option>
                                        </select>
                                    </div>
                                </div>

                                <BinanceOrderBook
                                    symbol={selectedSymbol}
                                    bids={orderBookData.bids}
                                    asks={orderBookData.asks}
                                    precision={selectedSymbol.includes('BTC') ? 2 : selectedSymbol.includes('ETH') ? 2 : 4}
                                    depth={15}
                                    isLoading={orderBookLoading}
                                    lastUpdateTime={orderBookData.timestamp}
                                    onRefresh={() => fetchOrderBook(selectedSymbol, orderBookDepth)}
                                    refreshInterval={orderBookRefreshRate}
                                />
                            </div>
                        ) : (
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
                                <div className="animate-pulse flex flex-col items-center justify-center">
                                    <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                                    <div className="text-sm text-gray-500 mt-4">Loading order book data...</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Kline Information */}
                    {klineData && (
                        <div className="mt-6 border-t border-gray-200 pt-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Latest Kline Data</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-sm text-blue-600 font-medium">Open</p>
                                    <p className="text-lg font-bold text-gray-800">
                                        ${parseFloat(klineData.kline.o).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                    <p className="text-sm text-green-600 font-medium">High</p>
                                    <p className="text-lg font-bold text-gray-800">
                                        ${parseFloat(klineData.kline.h).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                    <p className="text-sm text-red-600 font-medium">Low</p>
                                    <p className="text-lg font-bold text-gray-800">
                                        ${parseFloat(klineData.kline.l).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                                    <p className="text-sm text-purple-600 font-medium">Close</p>
                                    <p className="text-lg font-bold text-gray-800">
                                        ${parseFloat(klineData.kline.c).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 text-sm text-gray-500 space-y-1">
                                <p>Interval: {klineData.kline.i} | Trades: {klineData.kline.n} |
                                    Volume: {parseFloat(klineData.kline.v).toLocaleString()}</p>
                                <p>Start: {new Date(klineData.kline.t).toLocaleString()} |
                                    End: {new Date(klineData.kline.T).toLocaleString()}</p>
                                <p className={`inline-flex items-center gap-2 ${klineData.kline.x ? 'text-green-600' : 'text-orange-600'}`}>
                                    <span className={`w-2 h-2 rounded-full ${klineData.kline.x ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                                    {klineData.kline.x ? 'Kline Closed' : 'Kline Active'}
                                </p>
                            </div>
                        </div>
                    )}
            </div>
        </DashboardLayout>
    );
}