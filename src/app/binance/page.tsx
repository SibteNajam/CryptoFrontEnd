'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Activity, RefreshCw, TrendingUp, BarChart3, Clock, Loader2 } from 'lucide-react';
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts';
import { io, Socket } from 'socket.io-client';

// Types
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
interface BinanceKlineData {
    symbol: string;
    kline: {
        t: number; // Kline start time
        T: number; // Kline close time
        s: string; // Symbol
        i: string; // Interval
        f: number; // First trade ID
        L: number; // Last trade ID
        o: string; // Open price
        c: string; // Close price
        h: string; // High price
        l: string; // Low price
        v: string; // Base asset volume
        n: number; // Number of trades
        x: boolean; // Is this kline closed?
        q: string; // Quote asset volume
        V: string; // Taker buy base asset volume
        Q: string; // Taker buy quote asset volume
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

// ADD THIS NEW INTERFACE FOR HISTORICAL DATA
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

// Available intervals
const INTERVALS = [
    { value: '1m', label: '1m', name: '1 Minute' }, // ADD 1m BACK
    { value: '5m', label: '5m', name: '5 Minutes' },
    { value: '15m', label: '15m', name: '15 Minutes' },
    { value: '30m', label: '30m', name: '30 Minutes' },
    { value: '1h', label: '1h', name: '1 Hour' },
    { value: '4h', label: '4h', name: '4 Hours' },
    { value: '1d', label: '1D', name: '1 Day' },
    { value: '3d', label: '3D', name: '3 Days' },
    { value: '1M', label: '1M', name: '1 Month' },
];

export default function BinanceDashboard() {
    const [symbols, setSymbols] = useState<SymbolPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false); // ADD CHART LOADING STATE
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
    const [restPollingInterval, setRestPollingInterval] = useState(1000); // 3 seconds default
    // Chart refs
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const socketRef = useRef<Socket | null>(null);

    // Initialize WebSocket connection
    useEffect(() => {
        const socket = io('http://localhost:3000', {
            transports: ['websocket'],
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to server');
            setWsConnected(true);
            setChartLoading(true); // START LOADING WHEN CONNECTING
            // Subscribe to default symbol and interval WITH HISTORICAL DATA
            socket.emit('subscribe_symbol', {
                symbol: selectedSymbol,
                interval: selectedInterval,
                loadHistorical: true // IMPORTANT: REQUEST HISTORICAL DATA
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

        // ADD THIS: LISTEN FOR HISTORICAL DATA
        socket.on('historical_klines', (data: HistoricalKlines) => {
            console.log('📊 Received historical klines:', data);
            setChartLoading(false); // STOP LOADING
            loadHistoricalDataToChart(data);
        });

        socket.on('kline_data', (data: BinanceKlineData) => {
            console.log('🔴 Received live kline data:', data);
            setKlineData(data);
            updateChartWithKline(data);
        });

        socket.on('ticker_data', (data: BinanceTickerData) => {
            console.log('📈 LIVE TICKER UPDATE:', {
                symbol: data.symbol,
                price: data.ticker.lastPrice,
                change: data.ticker.priceChangePercent,
                timestamp: new Date().toLocaleTimeString()
            });

            setTickerData(data);
            setTickerUpdateCount(prev => prev + 1); // Track updates for debugging
        });

        socket.on('subscription_status', (data) => {
            console.log('✅ Subscription status:', data);
        });

        // ADD ERROR HANDLING
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
            try {
                console.log(`🔄 Fetching REST price for ${symbol}...`);
                const response = await fetch(
                    `${API_BASE_URL}/binance/getCoinInfo?symbol=${symbol}`
                );

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data: RestPriceData = await response.json();

                console.log('💰 REST Price Data:', {
                    symbol: data.symbol,
                    price: data.currentPrice,
                    timestamp: new Date().toLocaleTimeString()
                });

                setRestPriceData(data);
                setRestPollCount(prev => prev + 1);

                return data;
            } catch (error) {
                console.error('❌ Error fetching REST price:', error);
                return null;
            }
        };

        useEffect(() => {
            if (!active) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                return;
            }

            // Fetch immediately
            fetchRestPrice();

            // Set up polling
            intervalRef.current = setInterval(fetchRestPrice, interval);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            };
        }, [symbol, interval, active]);

        return { fetchRestPrice };
    };

    // Add this comparison calculator
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

    // Add the polling hook to your component
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
                width: chartContainerRef.current.clientWidth || 800, // ADD FALLBACK
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

            // Handle resize
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

    // ADD THIS: LOAD HISTORICAL DATA TO CHART
    const loadHistoricalDataToChart = (data: HistoricalKlines) => {
        if (candlestickSeriesRef.current) {
            const candlestickData: CandlestickData[] = data.data.map(kline => ({
                time: (kline[0] / 1000) as Time, // Convert to seconds
                open: parseFloat(kline[1]),
                high: parseFloat(kline[2]),
                low: parseFloat(kline[3]),
                close: parseFloat(kline[4]),
            }));

            candlestickSeriesRef.current.setData(candlestickData);
            console.log(`📊 Loaded ${candlestickData.length} historical candles for ${data.symbol}`);
        }
    };

    // UPDATE THIS: Handle both closed and forming candles
    const updateChartWithKline = (data: BinanceKlineData) => {
        if (candlestickSeriesRef.current) {
            const candle: CandlestickData = {
                time: (data.kline.t / 1000) as Time, // Convert to seconds
                open: parseFloat(data.kline.o),
                high: parseFloat(data.kline.h),
                low: parseFloat(data.kline.l),
                close: parseFloat(data.kline.c),
            };

            // Update the chart (works for both forming and closed candles)
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

    // UPDATE THIS: Handle symbol selection with historical data
    const handleSymbolClick = (symbol: string) => {
        if (symbol === selectedSymbol) return; // Don't reload same symbol

        setSelectedSymbol(symbol);
        setChartLoading(true);
        setError(null);

        if (socketRef.current && wsConnected) {
            // Subscribe to new symbol with current interval AND LOAD HISTORICAL DATA
            socketRef.current.emit('subscribe_symbol', {
                symbol: symbol,
                interval: selectedInterval,
                loadHistorical: true // IMPORTANT: REQUEST HISTORICAL DATA
            });
        }
    };

    // UPDATE THIS: Handle interval selection with historical data
    const handleIntervalChange = (interval: string) => {
        if (interval === selectedInterval) return; // Don't reload same interval

        setSelectedInterval(interval);
        setChartLoading(true);
        setError(null);

        if (socketRef.current && wsConnected) {
            // Subscribe to current symbol with new interval AND LOAD HISTORICAL DATA
            socketRef.current.emit('subscribe_symbol', {
                symbol: selectedSymbol,
                interval: interval,
                loadHistorical: true // IMPORTANT: REQUEST HISTORICAL DATA
            });
        }
    };

    // Initialize data on mount
    useEffect(() => {
        fetchSymbols();
        setChartLoading(true); // SHOW LOADING FOR INITIAL CHART LOAD
    }, []);

    // Split symbols into rows
    const firstRow = symbols.slice(0, 10);
    const secondRow = symbols.slice(10, 20);

    const renderSymbolCard = (symbol: SymbolPrice, rowPrefix: string, index: number) => {
        const cardKey = `${rowPrefix}-${symbol.symbol}`;
        const isHovered = hoveredCard === cardKey;
        const isSelected = selectedSymbol === symbol.symbol;

        return (
            <div
                key={cardKey}
                className={`
          relative bg-white p-3 rounded-md border cursor-pointer transition-all duration-200 min-h-[60px]
          flex flex-col justify-center items-center text-center
          ${isSelected
                        ? 'border-blue-500 shadow-lg shadow-blue-500/20 transform -translate-y-1'
                        : isHovered
                            ? 'border-blue-500 shadow-lg shadow-blue-500/15 transform -translate-y-1'
                            : 'border-gray-200 shadow-sm hover:shadow-md'
                    }
        `}
                onMouseEnter={() => setHoveredCard(cardKey)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => handleSymbolClick(symbol.symbol)}
            >
                <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp
                        size={12}
                        className={`transition-colors duration-200 ${isSelected || isHovered ? 'text-blue-500' : 'text-gray-500'
                            }`}
                    />
                    <h3 className={`
            text-xs font-bold transition-colors duration-200 truncate leading-none
            ${isSelected || isHovered ? 'text-blue-500' : 'text-gray-800'}
          `}>
                        {symbol.symbol}
                    </h3>
                </div>

                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mt-0.5 leading-none">
                    Active
                </div>

                <BarChart3
                    size={10}
                    className={`
            absolute top-1 right-1 transition-colors duration-200
            ${isSelected || isHovered ? 'text-blue-500' : 'text-gray-300'}
          `}
                />
            </div>
        );
    };

    const renderSkeletonCard = (key: string) => (
        <div key={key} className="bg-white p-3 rounded-md border border-gray-200 shadow-sm min-h-[60px] flex flex-col justify-center items-center">
            <div className="h-3 bg-gray-100 rounded w-3/5 mb-1 animate-pulse"></div>
            <div className="h-2 bg-gray-100 rounded w-2/5 mb-1 animate-pulse"></div>
            <div className="h-2 bg-gray-100 rounded w-1/2 animate-pulse"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 font-sans">
            <div className="max-w-7xl mx-auto px-6 py-5">
                {/* Header Section */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="p-3 bg-white rounded-lg border-2 border-gray-200 shadow-sm">
                            <Activity size={24} className="text-blue-500" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">
                            Binance Dashboard
                        </h1>
                    </div>
                    <p className="text-gray-600 text-sm mb-5 font-medium">
                        Live Trading Pairs Monitor - Real-time & Historical Data
                    </p>
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing || loading}
                        className={`
              flex items-center gap-2 mx-auto px-5 py-2.5 bg-white text-gray-800 border-2 border-gray-200 
              rounded-md text-sm font-semibold shadow-sm transition-all duration-200
              ${refreshing || loading
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:border-blue-500 hover:shadow-md hover:shadow-blue-500/15 hover:-translate-y-0.5'
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

                {/* WebSocket Status */}
                <div className="text-center mb-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        {wsConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
                    </div>
                </div>


                {/* Error Display */}
                {error && (
                    <div className="mb-5 p-4 bg-white border-2 border-red-500 rounded-md text-red-600 text-center shadow-sm">
                        <p className="font-semibold text-sm">{error}</p>
                    </div>
                )}

                {/* Trading Symbols Display */}
                {loading ? (
                    <div>
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(85px,1fr))] gap-2 max-w-6xl mx-auto mb-4">
                            {Array(10).fill(0).map((_, index) => renderSkeletonCard(`skeleton-1-${index}`))}
                        </div>
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(85px,1fr))] gap-2 max-w-6xl mx-auto mb-4">
                            {Array(10).fill(0).map((_, index) => renderSkeletonCard(`skeleton-2-${index}`))}
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(85px,1fr))] gap-2 max-w-6xl mx-auto mb-4">
                            {firstRow.map((symbol, index) => renderSymbolCard(symbol, 'row1', index))}
                        </div>
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(85px,1fr))] gap-2 max-w-6xl mx-auto mb-4">
                            {secondRow.map((symbol, index) => renderSymbolCard(symbol, 'row2', index))}
                        </div>
                    </div>
                )}
                <div className="text-center mb-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                        <span>📊 Ticker Updates: {tickerUpdateCount}</span>
                        {tickerData && (
                            <span>| Last: {new Date().toLocaleTimeString()}</span>
                        )}
                    </div>
                </div>

                {/* Trading Information Panel */}
                <div className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">
                            {selectedSymbol} - Live Trading Data
                        </h2>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock size={16} />
                            <span>Interval: {selectedInterval}</span>
                            {chartLoading && (
                                <Loader2 size={16} className="animate-spin text-blue-500" />
                            )}
                        </div>
                    </div>

                    {/* Interval Selection */}
                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Select Time Interval</h3>
                        <div className="flex flex-wrap gap-2">
                            {INTERVALS.map((interval) => (
                                <button
                                    key={interval.value}
                                    onClick={() => handleIntervalChange(interval.value)}
                                    disabled={chartLoading} // DISABLE DURING LOADING
                                    className={`
                    px-3 py-1.5 text-xs font-medium rounded-md border transition-all duration-200
                    ${selectedInterval === interval.value
                                            ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                                            : chartLoading
                                                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                                : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                        }
                  `}
                                    title={interval.name}
                                >
                                    {interval.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="text-center mb-4">
  <button
    onClick={() => setRestPollingActive(!restPollingActive)}
    className={`px-3 py-1 rounded text-xs font-medium ${
      restPollingActive ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'
    }`}
  >
    {restPollingActive ? '🟢 REST ON' : '⭕ REST OFF'}
  </button>
</div>

                    {/* Ticker Information */}
                    {tickerData && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            {/* WebSocket Current Price */}
                            <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-500">
                                <p className="text-xs text-blue-600 font-medium">🔴 WebSocket Price</p>
                                <p className="text-lg font-bold text-blue-700">
                                    ${parseFloat(tickerData.ticker.lastPrice).toLocaleString()}
                                </p>
                            </div>

                            {/* REST API Current Price */}
                            <div className="p-3 bg-orange-50 rounded-md border-l-4 border-orange-500">
                                <p className="text-xs text-orange-600 font-medium">📡 REST Price</p>
                                {restPriceData ? (
                                    <p className="text-lg font-bold text-orange-700">
                                        ${restPriceData.currentPrice.toLocaleString()}
                                    </p>
                                ) : (
                                    <p className="text-lg font-bold text-gray-400">No Data</p>
                                )}
                            </div>
                            <div className="p-3 bg-gray-50 rounded-md">
                                <p className="text-xs text-gray-500 font-medium">24h Change</p>
                                <p className={`text-lg font-bold ${parseFloat(tickerData.ticker.priceChangePercent) >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {parseFloat(tickerData.ticker.priceChangePercent).toFixed(2)}%
                                </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-md">
                                <p className="text-xs text-gray-500 font-medium">24h High</p>
                                <p className="text-lg font-bold text-green-600">
                                    ${parseFloat(tickerData.ticker.highPrice).toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-md">
                                <p className="text-xs text-gray-500 font-medium">24h Low</p>
                                <p className="text-lg font-bold text-red-600">
                                    ${parseFloat(tickerData.ticker.lowPrice).toLocaleString()}
                                </p>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-md">
                                <p className="text-xs text-gray-500 font-medium">24h Volume</p>
                                <p className="text-lg font-bold text-gray-800">
                                    {parseFloat(tickerData.ticker.volume).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Chart */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-md font-semibold text-gray-800">
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
                            className={`w-full border border-gray-200 rounded-md relative ${chartLoading ? 'opacity-50' : ''
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
                    </div>

                    {/* Kline Information */}
                    {klineData && (
                        <div className="border-t pt-4">
                            <h3 className="text-md font-semibold text-gray-800 mb-3">Latest Kline Data</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 bg-blue-50 rounded-md">
                                    <p className="text-xs text-blue-600 font-medium">Open</p>
                                    <p className="text-sm font-bold text-gray-800">
                                        ${parseFloat(klineData.kline.o).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-md">
                                    <p className="text-xs text-green-600 font-medium">High</p>
                                    <p className="text-sm font-bold text-gray-800">
                                        ${parseFloat(klineData.kline.h).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-red-50 rounded-md">
                                    <p className="text-xs text-red-600 font-medium">Low</p>
                                    <p className="text-sm font-bold text-gray-800">
                                        ${parseFloat(klineData.kline.l).toLocaleString()}
                                    </p>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-md">
                                    <p className="text-xs text-purple-600 font-medium">Close</p>
                                    <p className="text-sm font-bold text-gray-800">
                                        ${parseFloat(klineData.kline.c).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 text-xs text-gray-500">
                                <p>Interval: {klineData.kline.i} | Trades: {klineData.kline.n} |
                                    Volume: {parseFloat(klineData.kline.v).toLocaleString()}</p>
                                <p>Start: {new Date(klineData.kline.t).toLocaleString()} |
                                    End: {new Date(klineData.kline.T).toLocaleString()}</p>
                                <p className={`inline-flex items-center gap-1 ${klineData.kline.x ? 'text-green-600' : 'text-orange-600'}`}>
                                    <span className={`w-2 h-2 rounded-full ${klineData.kline.x ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                                    {klineData.kline.x ? 'Kline Closed' : 'Kline Active'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}