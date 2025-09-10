'use client';

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { io, Socket } from 'socket.io-client';
// import DashboardLayout from '../layout';
import SymbolCards from '../../../components/dashboard/SymbolCards';
import TradingPanel from '../../../components/charts/TradingPanel';
import BinanceOrderBook from '../../../components/dashboard/OrderBook';
import TradingViewChart from '../../../components/charts/TradingViewChart';
import { BinanceApiService } from '../../../api/BinanceOrder';
import PriceClickHandler from '../../../components/charts/priceClickHandler';
import TradesComponent from '@/components/dashboard/trades';
import TickerBar from '../../../components/dashboard/tickerBar';


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
                `Place ${order.side} order for ${order.quantity} ${order.symbol} ${order.type === 'LIMIT' ? `at $${order.price}` : 'at MARKET price'
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
        <div className="space-y-6">
            {/* Status Bar - Keep as is */}
            <div className="flex items-center justify-between bg-white px-1 shadow-sm">
                <div className="flex items-center space-x-4">
                    {/* <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                            }`}></div>
                        {wsConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
                    </div> */}

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
            {tickerData && (
                <TickerBar
                    selectedSymbol={selectedSymbol}
                    tickerData={tickerData}
                    userBalance={undefined} // Add user balance if available
                />
            )}
            {/* UPDATED MAIN TRADING LAYOUT */}
            <div className="bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto p-4 space-y-1">
                    {/* Chart and Trades Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
                        {/* Chart Section - Takes 2/3 width */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full">
                                {/* Chart Header */}
                                <div className="border-b border-gray-200 px-6 py-3  flex items-center justify-between bg-white flex-shrink-0">
                                    <div className="flex items-center space-x-6">
                                        <h2 className="text-lg font-semibold text-gray-900">{selectedSymbol}</h2>
                                        <select
                                            value={selectedInterval}
                                            onChange={(e) => handleIntervalChange(e.target.value)}
                                            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                                                <span className="text-lg font-medium text-gray-900">
                                                    ${parseFloat(tickerData.ticker.lastPrice).toLocaleString()}
                                                </span>
                                                <span className={`text-sm font-medium px-2 py-1 rounded ${parseFloat(tickerData.ticker.priceChangePercent) >= 0
                                                    ? 'text-green-700 bg-green-50'
                                                    : 'text-red-700 bg-red-50'
                                                    }`}>
                                                    {parseFloat(tickerData.ticker.priceChangePercent) >= 0 ? '+' : ''}
                                                    {parseFloat(tickerData.ticker.priceChangePercent).toFixed(2)}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Chart Container - Fills remaining space */}
                                <div className="bg-white flex-1" style={{ height: '500px' }}>
                                    <TradingViewChart
                                        symbol={`BINANCE:${selectedSymbol}`}
                                        interval={selectedInterval}
                                        theme="light"
                                        height="500px"
                                        width="100%"
                                        enableTrading={false}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Trades Section - Takes 1/3 width, exact same height as chart */}
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
                                        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-gray-500">Loading order book...</p>
                                    </div>
                                </div>
                            )}
                           
                        </div>
                    </div>

                    {/* Trading Panel and Order Book Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-1">
                        {/* Trading Panel Section - Takes 2/3 width */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                                {/* Trading Panel Header */}
                                <div className="border-b border-gray-200 px-6 py-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Place Order</h3>
                                    <p className="text-sm text-gray-500 mt-1">Buy or sell {selectedSymbol}</p>
                                </div>

                                {/* Trading Panel Content */}
                                <div className="p-6">
                                    <TradingPanel
                                        selectedSymbol={selectedSymbol}
                                        apiService={apiService}
                                    />

                                    <div className="mt-6 pt-6 border-t border-gray-200">
                                        <PriceClickHandler
                                            selectedSymbol={selectedSymbol}
                                            apiService={apiService}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Order Book Section - Takes 1/3 width */}
                        <div className="lg:col-span-1">


                            <TradesComponent symbol={selectedSymbol} />

                        </div>
                    </div>
                </div>
            </div>

            {/* Kline Information - Keep as is */}
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
    );
}
