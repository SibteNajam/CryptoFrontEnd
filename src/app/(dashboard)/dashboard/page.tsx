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
import { useTheme } from '@/infrastructure/theme/ThemeContext';

// [Keep all your existing interfaces - they remain the same]
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
    const { theme } = useTheme(); // ✅ Get current theme

    const [symbols, setSymbols] = useState<SymbolPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const [selectedSymbol, setSelectedSymbol] = useState<string>('SUIUSDT');
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

    const [restLatency, setRestLatency] = useState<RestLatencyData | null>(null);
    const [isRequestPending, setIsRequestPending] = useState(false);

    const [webSocketTiming, setWebSocketTiming] = useState<WebSocketTimingData | null>(null);
    const [lastWebSocketUpdateTime, setLastWebSocketUpdateTime] = useState<number>(0);
    const [webSocketUpdateHistory, setWebSocketUpdateHistory] = useState<WebSocketTimingData[]>([]);

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const [orderBookData, setOrderBookData] = useState<OrderBookData | null>(null);
    const [orderBookLoading, setOrderBookLoading] = useState(false);
    const [orderBookDepth, setOrderBookDepth] = useState(200);
    const [orderBookRefreshRate, setOrderBookRefreshRate] = useState<number>(3000);
    const [apiService] = useState(() => new BinanceApiService());
    const [recentOrders, setRecentOrders] = useState<any[]>([]);


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

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchSymbols();
        setTimeout(() => setRefreshing(false), 500);
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
        setChartLoading(true);
    }, []);

    useEffect(() => {
        if (selectedSymbol) {
            fetchOrderBook(selectedSymbol, orderBookDepth);
        }
    }, [selectedSymbol]);

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

    const averageWebSocketInterval = webSocketUpdateHistory.length > 0
        ? webSocketUpdateHistory.reduce((sum, update) => sum + update.intervalBetweenUpdates, 0) / webSocketUpdateHistory.length
        : 0;

    return (
        <div className="space-y-1">
            {/* Status Bar */}
            <div className="flex items-center justify-between bg-card px-1 shadow-sm">
                <div className="flex items-center space-x-4">
                    {/* Ticker Updates Display */}
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
                        {restLatency && (
                            <span className="text-warning">
                                | 📡 REST: {restLatency.totalLatency.toFixed(0)}ms
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
    availableSymbols={symbols} // Pass your fetched symbols array
    onSymbolChange={handleSymbolClick} // Use existing handler
/>
            )}

            {/* UPDATED MAIN TRADING LAYOUT */}
            <div className="bg-muted min-h-screen">
                <div className="max-w-7xl mx-auto ">
                    {/* Chart and Trades Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3">
                        {/* Chart Section - Takes 2/3 width */}
                        <div className="lg:col-span-2">
                            <div className="bg-card rounded-sm border border-default shadow-sm overflow-hidden h-full">
                                {/* Chart Header */}
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

                                {/* Chart Container */}
                                <div className="bg-card flex-1" style={{ height: '500px' }}>
                                    <TradingViewChart
                                        symbol={`BINANCE:${selectedSymbol}`}
                                        interval={selectedInterval}
                                        theme={theme} // ✅ Pass current theme from context
                                        height="500px"
                                        width="100%"
                                        enableTrading={false}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Trades Section */}
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

                    {/* Trading Panel and Order Book Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 ">
                        {/* Trading Panel Section */}
                        <div className="lg:col-span-2">
                            <div className="bg-card rounded-sm border border-default shadow-sm" style={{ height: '580px' }}>
                                {/* Trading Panel Content */}
                                <div className="p-3 h-full overflow-hidden">
                                    <TradingPanel
                                        selectedSymbol={selectedSymbol}
                                        apiService={apiService}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Order Book Section */}
                        <div className="lg:col-span-1">
                            <TradesComponent symbol={selectedSymbol} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}