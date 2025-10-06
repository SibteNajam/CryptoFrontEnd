'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, CandlestickData, LineData, ISeriesApi } from 'lightweight-charts';
import { io, Socket } from 'socket.io-client';
import { Activity, TrendingUp, BarChart3, Settings, Wifi, WifiOff } from 'lucide-react';

interface CandleWithIndicators {
  openTime: string;
  closeTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quoteVolume: number;
  trades: number;
  indicators: {
    rsi?: number;
    ema?: number;
    bollingerBands?: {
      upperBand: number;
      lowerBand: number;
      sma: number;
      percentB: number;
    };
    cvdSlope?: number;
    inverseATR?: number;
  };
}

interface TickerData {
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
}

const CHART_CONFIG = {
  width: 0,
  height: 600,
  layout: {
    background: { color: '#0f1419' },
    textColor: '#d1d4dc',
  },
  grid: {
    vertLines: { color: '#1e2328' },
    horzLines: { color: '#1e2328' },
  },
  crosshair: {
    mode: 1,
    vertLine: {
      width: 1 as const,
      color: '#9598a1',
      style: 3 as const,
    },
    horzLine: {
      width: 1 as const,
      color: '#9598a1',
      style: 3 as const,
    },
  },
  rightPriceScale: {
    borderColor: '#485c7b',
    scaleMargins: {
      top: 0.1,
      bottom: 0.1,
    },
  },
  timeScale: {
    borderColor: '#485c7b',
    timeVisible: true,
    secondsVisible: false,
  },
};

const SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT', 
  'LTCUSDT', 'BCHUSDT', 'XLMUSDT', 'XRPUSDT', 'BNBUSDT'
];

const INTERVALS = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1D' },
  { value: '1w', label: '1W' },
];

const INDICATOR_COLORS = {
  ema: '#f39c12',
  rsi: '#e74c3c',
  bollingerUpper: '#9b59b6',
  bollingerLower: '#9b59b6',
  bollingerMiddle: '#8e44ad',
  cvdSlope: '#00d2ff',
  inverseATR: '#ff6b6b',
};

export default function CryptoTradingChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const seriesRef = useRef<{
    candlestick?: ISeriesApi<'Candlestick'>;
    ema?: ISeriesApi<'Line'>;
    bollingerUpper?: ISeriesApi<'Line'>;
    bollingerLower?: ISeriesApi<'Line'>;
    bollingerMiddle?: ISeriesApi<'Line'>;
    rsi?: ISeriesApi<'Line'>;
    cvdSlope?: ISeriesApi<'Line'>;
    inverseATR?: ISeriesApi<'Line'>;
  }>({});

  // State
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(
    new Set(['ema', 'bollingerBands', 'rsi'])
  );
  const [showSettings, setShowSettings] = useState(false);
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);

  // Initialize chart
  const initChart = useCallback(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      ...CHART_CONFIG,
      width: chartContainerRef.current.clientWidth,
    });

    chartRef.current = chart;

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00ff88',
      downColor: '#ff4757',
      borderUpColor: '#00ff88',
      borderDownColor: '#ff4757',
      wickUpColor: '#00ff88',
      wickDownColor: '#ff4757',
    });

    seriesRef.current.candlestick = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scale indicator to price range
  const scaleIndicatorToPrice = useCallback((value: number, min: number, max: number, position: 'top' | 'bottom' | 'middle' = 'bottom') => {
    if (!priceRange) return value;
    
    const range = priceRange.max - priceRange.min;
    const normalizedValue = (value - min) / (max - min);
    
    switch (position) {
      case 'top':
        return priceRange.max - (normalizedValue * range * 0.2);
      case 'middle':
        return priceRange.min + range * 0.4 + (normalizedValue * range * 0.2);
      case 'bottom':
      default:
        return priceRange.min + (normalizedValue * range * 0.2);
    }
  }, [priceRange]);

  // Update indicators
  const updateIndicators = useCallback((candles: CandleWithIndicators[]) => {
    if (!chartRef.current || candles.length === 0) return;

    // Calculate price range
    const allPrices = candles.flatMap(c => [c.high, c.low]);
    const min = Math.min(...allPrices);
    const max = Math.max(...allPrices);
    setPriceRange({ min, max });

    // Convert to lightweight-charts format
    const times = candles.map(c => new Date(c.openTime).getTime() / 1000);

    // EMA
    if (activeIndicators.has('ema') && !seriesRef.current.ema) {
      seriesRef.current.ema = chartRef.current.addLineSeries({
        color: INDICATOR_COLORS.ema,
        lineWidth: 2,
        title: 'EMA 20',
        priceLineVisible: false,
      });
    }

    if (seriesRef.current.ema && activeIndicators.has('ema')) {
      const emaData: LineData[] = candles
        .filter(c => c.indicators.ema)
        .map((c, i) => ({
          time: times[candles.indexOf(c)] as any,
          value: c.indicators.ema!
        }));
      seriesRef.current.ema.setData(emaData);
    }

    // Bollinger Bands
    if (activeIndicators.has('bollingerBands')) {
      if (!seriesRef.current.bollingerUpper) {
        seriesRef.current.bollingerUpper = chartRef.current.addLineSeries({
          color: INDICATOR_COLORS.bollingerUpper,
          lineWidth: 1,
          title: 'BB Upper',
          priceLineVisible: false,
        });
      }
      if (!seriesRef.current.bollingerLower) {
        seriesRef.current.bollingerLower = chartRef.current.addLineSeries({
          color: INDICATOR_COLORS.bollingerLower,
          lineWidth: 1,
          title: 'BB Lower',
          priceLineVisible: false,
        });
      }
      if (!seriesRef.current.bollingerMiddle) {
        seriesRef.current.bollingerMiddle = chartRef.current.addLineSeries({
          color: INDICATOR_COLORS.bollingerMiddle,
          lineWidth: 1,
          title: 'BB Middle',
          priceLineVisible: false,
        });
      }

      const upperData: LineData[] = candles
        .filter(c => c.indicators.bollingerBands)
        .map((c, i) => ({
          time: times[candles.indexOf(c)] as any,
          value: c.indicators.bollingerBands!.upperBand
        }));

      const lowerData: LineData[] = candles
        .filter(c => c.indicators.bollingerBands)
        .map((c, i) => ({
          time: times[candles.indexOf(c)] as any,
          value: c.indicators.bollingerBands!.lowerBand
        }));

      const middleData: LineData[] = candles
        .filter(c => c.indicators.bollingerBands)
        .map((c, i) => ({
          time: times[candles.indexOf(c)] as any,
          value: c.indicators.bollingerBands!.sma
        }));

      seriesRef.current.bollingerUpper.setData(upperData);
      seriesRef.current.bollingerLower.setData(lowerData);
      seriesRef.current.bollingerMiddle.setData(middleData);
    }

    // RSI (scaled to price range)
    if (activeIndicators.has('rsi') && !seriesRef.current.rsi) {
      seriesRef.current.rsi = chartRef.current.addLineSeries({
        color: INDICATOR_COLORS.rsi,
        lineWidth: 2,
        title: 'RSI (Scaled)',
        priceLineVisible: false,
      });
    }

    if (seriesRef.current.rsi && activeIndicators.has('rsi')) {
      const rsiData: LineData[] = candles
        .filter(c => c.indicators.rsi)
        .map((c, i) => ({
          time: times[candles.indexOf(c)] as any,
          value: scaleIndicatorToPrice(c.indicators.rsi!, 0, 100, 'bottom')
        }));
      seriesRef.current.rsi.setData(rsiData);
    }

    // CVD Slope (scaled)
    if (activeIndicators.has('cvdSlope') && !seriesRef.current.cvdSlope) {
      seriesRef.current.cvdSlope = chartRef.current.addLineSeries({
        color: INDICATOR_COLORS.cvdSlope,
        lineWidth: 2,
        title: 'CVD Slope (Scaled)',
        priceLineVisible: false,
      });
    }

    if (seriesRef.current.cvdSlope && activeIndicators.has('cvdSlope')) {
      const cvdValues = candles.filter(c => c.indicators.cvdSlope).map(c => c.indicators.cvdSlope!);
      if (cvdValues.length > 0) {
        const cvdMin = Math.min(...cvdValues);
        const cvdMax = Math.max(...cvdValues);
        
        const cvdData: LineData[] = candles
          .filter(c => c.indicators.cvdSlope)
          .map((c, i) => ({
            time: times[candles.indexOf(c)] as any,
            value: scaleIndicatorToPrice(c.indicators.cvdSlope!, cvdMin, cvdMax, 'top')
          }));
        seriesRef.current.cvdSlope.setData(cvdData);
      }
    }

    // Inverse ATR (scaled)
    if (activeIndicators.has('inverseATR') && !seriesRef.current.inverseATR) {
      seriesRef.current.inverseATR = chartRef.current.addLineSeries({
        color: INDICATOR_COLORS.inverseATR,
        lineWidth: 2,
        title: 'Inverse ATR (Scaled)',
        priceLineVisible: false,
      });
    }

    if (seriesRef.current.inverseATR && activeIndicators.has('inverseATR')) {
      const atrValues = candles.filter(c => c.indicators.inverseATR).map(c => c.indicators.inverseATR!);
      if (atrValues.length > 0) {
        const atrMin = Math.min(...atrValues);
        const atrMax = Math.max(...atrValues);
        
        const atrData: LineData[] = candles
          .filter(c => c.indicators.inverseATR)
          .map((c, i) => ({
            time: times[candles.indexOf(c)] as any,
            value: scaleIndicatorToPrice(c.indicators.inverseATR!, atrMin, atrMax, 'middle')
          }));
        seriesRef.current.inverseATR.setData(atrData);
      }
    }
  }, [activeIndicators, scaleIndicatorToPrice]);

  // Initialize WebSocket connection
  const initWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    setConnectionStatus('connecting');
    const socket = io('http://localhost:3000', {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      console.log('Connected to WebSocket');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      console.log('Disconnected from WebSocket');
    });

    socket.on('connection_status', (data) => {
      console.log('Connection status:', data);
    });

    socket.on('historical_candles_with_indicators', (data: {
      symbol: string;
      interval: string;
      data: CandleWithIndicators[];
      count: number;
      timestamp: string;
    }) => {
      console.log('Received historical data:', data.count, 'candles');
      
      if (seriesRef.current.candlestick && data.data.length > 0) {
        const candleData: CandlestickData[] = data.data.map(c => ({
          time: new Date(c.openTime).getTime() / 1000 as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));

        seriesRef.current.candlestick.setData(candleData);
        updateIndicators(data.data);
        
        if (chartRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      }
    });

    socket.on('kline_with_indicators', (data: {
      symbol: string;
      interval: string;
      candle: CandleWithIndicators;
      isClosed: boolean;
      timestamp: string;
    }) => {
      if (seriesRef.current.candlestick) {
        const candleData: CandlestickData = {
          time: new Date(data.candle.openTime).getTime() / 1000 as any,
          open: data.candle.open,
          high: data.candle.high,
          low: data.candle.low,
          close: data.candle.close,
        };

        seriesRef.current.candlestick.update(candleData);
        updateIndicators([data.candle]);
      }
    });

    socket.on('ticker_data', (data: {
      symbol: string;
      ticker: TickerData;
      timestamp: string;
    }) => {
      setTickerData(data.ticker);
    });

    return socket;
  }, [updateIndicators]);

  // Subscribe to symbol data
  const subscribeToSymbol = useCallback(() => {
    if (socketRef.current && connectionStatus === 'connected') {
      console.log(`Subscribing to ${symbol} ${interval}`);
      socketRef.current.emit('subscribe_symbol_with_indicators', {
        symbol,
        interval,
        limit: 500
      });
    }
  }, [symbol, interval, connectionStatus]);

  // Toggle indicator
  const toggleIndicator = useCallback((indicator: string) => {
    const newIndicators = new Set(activeIndicators);
    if (newIndicators.has(indicator)) {
      newIndicators.delete(indicator);
      
      // Remove series from chart
      if (indicator === 'ema' && seriesRef.current.ema) {
        chartRef.current?.removeSeries(seriesRef.current.ema);
        delete seriesRef.current.ema;
      } else if (indicator === 'bollingerBands') {
        if (seriesRef.current.bollingerUpper) {
          chartRef.current?.removeSeries(seriesRef.current.bollingerUpper);
          delete seriesRef.current.bollingerUpper;
        }
        if (seriesRef.current.bollingerLower) {
          chartRef.current?.removeSeries(seriesRef.current.bollingerLower);
          delete seriesRef.current.bollingerLower;
        }
        if (seriesRef.current.bollingerMiddle) {
          chartRef.current?.removeSeries(seriesRef.current.bollingerMiddle);
          delete seriesRef.current.bollingerMiddle;
        }
      } else if (indicator === 'rsi' && seriesRef.current.rsi) {
        chartRef.current?.removeSeries(seriesRef.current.rsi);
        delete seriesRef.current.rsi;
      } else if (indicator === 'cvdSlope' && seriesRef.current.cvdSlope) {
        chartRef.current?.removeSeries(seriesRef.current.cvdSlope);
        delete seriesRef.current.cvdSlope;
      } else if (indicator === 'inverseATR' && seriesRef.current.inverseATR) {
        chartRef.current?.removeSeries(seriesRef.current.inverseATR);
        delete seriesRef.current.inverseATR;
      }
    } else {
      newIndicators.add(indicator);
    }
    setActiveIndicators(newIndicators);
  }, [activeIndicators]);

  // Effects
  useEffect(() => {
    initChart();
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [initChart]);

  useEffect(() => {
    const socket = initWebSocket();
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [initWebSocket]);

  useEffect(() => {
    subscribeToSymbol();
  }, [subscribeToSymbol]);

  const formatPrice = (price: string) => {
    return parseFloat(price).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    });
  };

  const formatPercent = (percent: string) => {
    const val = parseFloat(percent);
    return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-8 h-8 text-blue-500" />
              <h1 className="text-2xl font-bold">Crypto Trading Chart</h1>
            </div>
            <div className="flex items-center space-x-2">
              {connectionStatus === 'connected' ? (
                <Wifi className="w-5 h-5 text-green-500" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}
              <span className="text-sm capitalize text-gray-400">
                {connectionStatus}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Symbol & Timeframe */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Symbol</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SYMBOLS.map((sym) => (
                    <option key={sym} value={sym}>{sym}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Timeframe</label>
                <div className="grid grid-cols-4 gap-1">
                  {INTERVALS.map((int) => (
                    <button
                      key={int.value}
                      onClick={() => setInterval(int.value)}
                      className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
                        interval === int.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {int.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Price Info */}
          {tickerData && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Price Data</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Last Price</span>
                  <span className="font-medium">${formatPrice(tickerData.lastPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">24h Change</span>
                  <span className={`font-medium ${
                    parseFloat(tickerData.priceChangePercent) >= 0 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  }`}>
                    {formatPercent(tickerData.priceChangePercent)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">24h High</span>
                  <span className="font-medium">${formatPrice(tickerData.highPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">24h Low</span>
                  <span className="font-medium">${formatPrice(tickerData.lowPrice)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Indicators */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Technical Indicators</h3>
            <div className="space-y-2">
              {[
                { key: 'ema', label: 'EMA 20', color: INDICATOR_COLORS.ema },
                { key: 'bollingerBands', label: 'Bollinger Bands', color: INDICATOR_COLORS.bollingerUpper },
                { key: 'rsi', label: 'RSI (Scaled)', color: INDICATOR_COLORS.rsi },
                { key: 'cvdSlope', label: 'CVD Slope', color: INDICATOR_COLORS.cvdSlope },
                { key: 'inverseATR', label: 'Inverse ATR', color: INDICATOR_COLORS.inverseATR },
              ].map((indicator) => (
                <button
                  key={indicator.key}
                  onClick={() => toggleIndicator(indicator.key)}
                  className={`flex items-center space-x-2 w-full px-2 py-1 rounded text-sm transition-colors ${
                    activeIndicators.has(indicator.key)
                      ? 'bg-gray-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: indicator.color }}
                  />
                  <span>{indicator.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div 
            ref={chartContainerRef}
            className="w-full"
            style={{ height: '600px' }}
          />
        </div>

        {/* Status Bar */}
        <div className="mt-4 bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-4">
              <span>Active: {symbol} • {interval}</span>
              <span>Indicators: {activeIndicators.size}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Live Updates</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}