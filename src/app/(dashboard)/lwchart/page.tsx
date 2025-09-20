'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, LineData, HistogramData } from 'lightweight-charts';

// Technical indicator calculations
const calculateSMA = (data: number[], period: number): number[] => {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
};

const calculateEMA = (data: number[], period: number): number[] => {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[i]);
    } else {
      result.push((data[i] - result[i - 1]) * multiplier + result[i - 1]);
    }
  }
  return result;
};

const calculateRSI = (data: number[], period: number = 14): number[] => {
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }
  
  const avgGains = calculateSMA(gains, period);
  const avgLosses = calculateSMA(losses, period);
  
  const result: number[] = [NaN];
  for (let i = 0; i < avgGains.length; i++) {
    if (avgLosses[i] === 0) {
      result.push(100);
    } else {
      const rs = avgGains[i] / avgLosses[i];
      result.push(100 - (100 / (1 + rs)));
    }
  }
  return result;
};

// Scale RSI to price range for overlay
const scaleRSIToPrice = (rsi: number[], priceMin: number, priceMax: number): number[] => {
  const priceRange = priceMax - priceMin;
  return rsi.map(value => {
    if (isNaN(value)) return NaN;
    // Scale RSI (0-100) to bottom 20% of price chart
    return priceMin + (value / 100) * (priceRange * 0.2);
  });
};

const calculateBollingerBands = (data: number[], period: number = 20, stdDev: number = 2) => {
  const sma = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }
  
  return { upper, middle: sma, lower };
};

const calculateATR = (high: number[], low: number[], close: number[], period: number = 14): number[] => {
  const trueRanges: number[] = [];
  
  for (let i = 1; i < high.length; i++) {
    const tr1 = high[i] - low[i];
    const tr2 = Math.abs(high[i] - close[i - 1]);
    const tr3 = Math.abs(low[i] - close[i - 1]);
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  return [NaN, ...calculateSMA(trueRanges, period)];
};

// Scale ATR to price range for overlay
const scaleATRToPrice = (atr: number[], closes: number[], priceMin: number, priceMax: number): number[] => {
  const priceRange = priceMax - priceMin;
  const maxATR = Math.max(...atr.filter(val => !isNaN(val)));
  
  return atr.map((value, i) => {
    if (isNaN(value)) return NaN;
    // Scale ATR relative to price and show in middle area
    const basePrice = closes[i] || priceMin;
    return basePrice + (value / maxATR) * (priceRange * 0.1);
  });
};

const calculateMACD = (data: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) => {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = calculateEMA(macdLine.filter(val => !isNaN(val)), signalPeriod);
  const histogram = macdLine.map((macd, i) => macd - (signalLine[i] || 0));
  
  return { macdLine, signalLine, histogram };
};

// Scale MACD to price range for overlay
const scaleMACDToPrice = (macd: number[], priceMin: number, priceMax: number): number[] => {
  const validMacd = macd.filter(val => !isNaN(val));
  const macdMin = Math.min(...validMacd);
  const macdMax = Math.max(...validMacd);
  const macdRange = macdMax - macdMin;
  const priceRange = priceMax - priceMin;
  
  return macd.map(value => {
    if (isNaN(value) || macdRange === 0) return NaN;
    // Scale MACD to top 20% of price chart
    const normalizedValue = (value - macdMin) / macdRange;
    return priceMax - (normalizedValue * priceRange * 0.2);
  });
};

const calculateStochastic = (high: number[], low: number[], close: number[], kPeriod: number = 14, dPeriod: number = 3) => {
  const kValues: number[] = [];
  
  for (let i = 0; i < close.length; i++) {
    if (i < kPeriod - 1) {
      kValues.push(NaN);
    } else {
      const highestHigh = Math.max(...high.slice(i - kPeriod + 1, i + 1));
      const lowestLow = Math.min(...low.slice(i - kPeriod + 1, i + 1));
      kValues.push(((close[i] - lowestLow) / (highestHigh - lowestLow)) * 100);
    }
  }
  
  const dValues = calculateSMA(kValues, dPeriod);
  return { k: kValues, d: dValues };
};

// Scale Stochastic to price range for overlay
const scaleStochasticToPrice = (stoch: number[], priceMin: number, priceMax: number): number[] => {
  const priceRange = priceMax - priceMin;
  return stoch.map(value => {
    if (isNaN(value)) return NaN;
    // Scale Stochastic (0-100) to bottom 25% of price chart
    return priceMin + (value / 100) * (priceRange * 0.25);
  });
};

const calculateWilliamsR = (high: number[], low: number[], close: number[], period: number = 14): number[] => {
  const result: number[] = [];
  
  for (let i = 0; i < close.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const highestHigh = Math.max(...high.slice(i - period + 1, i + 1));
      const lowestLow = Math.min(...low.slice(i - period + 1, i + 1));
      const williamsR = ((highestHigh - close[i]) / (highestHigh - lowestLow)) * -100;
      result.push(williamsR);
    }
  }
  
  return result;
};

const calculateCCI = (high: number[], low: number[], close: number[], period: number = 20): number[] => {
  const typicalPrice = high.map((h, i) => (h + low[i] + close[i]) / 3);
  const smaTP = calculateSMA(typicalPrice, period);
  const result: number[] = [];
  
  for (let i = 0; i < typicalPrice.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = typicalPrice.slice(i - period + 1, i + 1);
      const meanDeviation = slice.reduce((sum, val) => sum + Math.abs(val - smaTP[i]), 0) / period;
      const cci = (typicalPrice[i] - smaTP[i]) / (0.015 * meanDeviation);
      result.push(cci);
    }
  }
  
  return result;
};

// Scale CCI to price range for overlay
const scaleCCIToPrice = (cci: number[], priceMin: number, priceMax: number): number[] => {
  const validCCI = cci.filter(val => !isNaN(val));
  const cciMin = Math.min(...validCCI);
  const cciMax = Math.max(...validCCI);
  const cciRange = cciMax - cciMin;
  const priceRange = priceMax - priceMin;
  
  return cci.map(value => {
    if (isNaN(value) || cciRange === 0) return NaN;
    // Scale CCI to middle area of price chart
    const normalizedValue = (value - cciMin) / cciRange;
    return priceMin + priceRange * 0.3 + (normalizedValue * priceRange * 0.4);
  });
};

// Generate sample crypto data
const generateSampleData = (): CandlestickData[] => {
  const data: CandlestickData[] = [];
  let price = 45000; // Starting BTC price
  
  for (let i = 0; i < 500; i++) {
    const time = (Date.now() / 1000 - (500 - i) * 24 * 60 * 60) as any;
    const change = (Math.random() - 0.5) * 0.04 * price;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 0.02 * price;
    const low = Math.min(open, close) - Math.random() * 0.02 * price;
    
    data.push({
      time,
      open,
      high,
      low,
      close
    });
    
    price = close;
  }
  
  return data;
};

const CryptoTradingChart: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<Set<string>>(
    new Set(['RSI', 'EMA20', 'BBands', 'MACD'])
  );
  const [timeframe, setTimeframe] = useState('1D');
  
  const indicators = [
    'RSI', 'MACD', 'BBands', 'EMA20', 'EMA50', 'SMA10', 'ATR', 'Stoch', 'Williams%R', 'CCI'
  ];
  
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D', '1W'];
  
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Clear any existing child charts
    while (chartContainerRef.current.children.length > 0) {
      chartContainerRef.current.removeChild(chartContainerRef.current.children[0]);
    }
    
    // Create main chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 700, // Increased height for better visibility
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2a2e39' },
        horzLines: { color: '#2a2e39' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#758696',
          style: 3,
        },
        horzLine: {
          width: 1,
          color: '#758696',
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: '#485c7b',
      },
      timeScale: {
        borderColor: '#485c7b',
        timeVisible: true,
        secondsVisible: false,
      },
    });
    
    chartRef.current = chart;
    
    // Generate and add candlestick data
    const sampleData = generateSampleData();
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00ff88',
      downColor: '#ff4757',
      borderUpColor: '#00ff88',
      borderDownColor: '#ff4757',
      wickUpColor: '#00ff88',
      wickDownColor: '#ff4757',
    });
    
    candlestickSeries.setData(sampleData);
    
    // Extract OHLC data for calculations
    const closes = sampleData.map(d => d.close);
    const highs = sampleData.map(d => d.high);
    const lows = sampleData.map(d => d.low);
    const times = sampleData.map(d => d.time);
    
    // Calculate price range for scaling oscillators
    const allPrices = [...highs, ...lows];
    const priceMin = Math.min(...allPrices);
    const priceMax = Math.max(...allPrices);
    
    // Add indicators based on active selection - ALL ON MAIN CHART
    const seriesMap = new Map<string, ISeriesApi<any>>();
    
    // Price-based indicators (overlays)
    if (activeIndicators.has('EMA20')) {
      const ema20Series = chart.addLineSeries({
        color: '#3498db',
        lineWidth: 2,
        title: 'EMA 20',
        priceLineVisible: false,
      });
      
      const ema20Data = calculateEMA(closes, 20).map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      ema20Series.setData(ema20Data);
      seriesMap.set('EMA20', ema20Series);
    }
    
    if (activeIndicators.has('EMA50')) {
      const ema50Series = chart.addLineSeries({
        color: '#e74c3c',
        lineWidth: 2,
        title: 'EMA 50',
        priceLineVisible: false,
      });
      
      const ema50Data = calculateEMA(closes, 50).map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      ema50Series.setData(ema50Data);
      seriesMap.set('EMA50', ema50Series);
    }
    
    if (activeIndicators.has('SMA10')) {
      const sma10Series = chart.addLineSeries({
        color: '#f39c12',
        lineWidth: 2,
        title: 'SMA 10',
        priceLineVisible: false,
      });
      
      const sma10Data = calculateSMA(closes, 10).map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      sma10Series.setData(sma10Data);
      seriesMap.set('SMA10', sma10Series);
    }
    
    if (activeIndicators.has('BBands')) {
      const bbands = calculateBollingerBands(closes, 20, 2);
      
      const upperBandSeries = chart.addLineSeries({
        color: '#9b59b6',
        lineWidth: 1,
        title: 'BB Upper',
        priceLineVisible: false,
      });
      
      const lowerBandSeries = chart.addLineSeries({
        color: '#9b59b6',
        lineWidth: 1,
        title: 'BB Lower',
        priceLineVisible: false,
      });
      
      const middleBandSeries = chart.addLineSeries({
        color: '#8e44ad',
        lineWidth: 1,
        title: 'BB Middle',
        priceLineVisible: false,
      });
      
      const upperData = bbands.upper.map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      const lowerData = bbands.lower.map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      const middleData = bbands.middle.map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      upperBandSeries.setData(upperData);
      lowerBandSeries.setData(lowerData);
      middleBandSeries.setData(middleData);
      
      seriesMap.set('BBands', upperBandSeries);
    }
    
    // Oscillator indicators (scaled to fit on main chart)
    if (activeIndicators.has('RSI')) {
      const rsiSeries = chart.addLineSeries({
        color: '#ff6b6b',
        lineWidth: 2,
        title: 'RSI (Scaled)',
        priceLineVisible: false,
      });
      
      const rsiValues = calculateRSI(closes);
      const scaledRSI = scaleRSIToPrice(rsiValues, priceMin, priceMax);
      
      const rsiData = scaledRSI.map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      rsiSeries.setData(rsiData);
      seriesMap.set('RSI', rsiSeries);
    }
    
    if (activeIndicators.has('MACD')) {
      const macd = calculateMACD(closes);
      
      const macdSeries = chart.addLineSeries({
        color: '#00d2ff',
        lineWidth: 2,
        title: 'MACD (Scaled)',
        priceLineVisible: false,
      });
      
      const signalSeries = chart.addLineSeries({
        color: '#ff4757',
        lineWidth: 2,
        title: 'MACD Signal',
        priceLineVisible: false,
      });
      
      const scaledMACD = scaleMACDToPrice(macd.macdLine, priceMin, priceMax);
      const scaledSignal = scaleMACDToPrice(macd.signalLine, priceMin, priceMax);
      
      const macdData = scaledMACD.map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      const signalData = scaledSignal.map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      macdSeries.setData(macdData);
      signalSeries.setData(signalData);
      
      seriesMap.set('MACD', macdSeries);
    }
    
    if (activeIndicators.has('ATR')) {
      const atr = calculateATR(highs, lows, closes);
      const scaledATR = scaleATRToPrice(atr, closes, priceMin, priceMax);
      
      const atrSeries = chart.addLineSeries({
        color: '#ff9800',
        lineWidth: 2,
        title: 'ATR (Scaled)',
        priceLineVisible: false,
      });
      
      const atrData = scaledATR.map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      atrSeries.setData(atrData);
      seriesMap.set('ATR', atrSeries);
    }
    
    if (activeIndicators.has('Stoch')) {
      const stoch = calculateStochastic(highs, lows, closes);
      
      const stochKSeries = chart.addLineSeries({
        color: '#4caf50',
        lineWidth: 2,
        title: 'Stoch %K (Scaled)',
        priceLineVisible: false,
      });
      
      const stochDSeries = chart.addLineSeries({
        color: '#2196f3',
        lineWidth: 2,
        title: 'Stoch %D (Scaled)',
        priceLineVisible: false,
      });
      
      const scaledK = scaleStochasticToPrice(stoch.k, priceMin, priceMax);
      const scaledD = scaleStochasticToPrice(stoch.d, priceMin, priceMax);
      
      const kData = scaledK.map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      const dData = scaledD.map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      stochKSeries.setData(kData);
      stochDSeries.setData(dData);
      
      seriesMap.set('Stoch', stochKSeries);
    }
    
    if (activeIndicators.has('Williams%R')) {
      const williamsR = calculateWilliamsR(highs, lows, closes);
      const scaledWilliamsR = scaleStochasticToPrice(
        williamsR.map(val => isNaN(val) ? NaN : val + 100), // Convert from -100,0 to 0,100
        priceMin, priceMax
      );
      
      const williamsRSeries = chart.addLineSeries({
        color: '#e91e63',
        lineWidth: 2,
        title: 'Williams %R (Scaled)',
        priceLineVisible: false,
      });
      
      const williamsRData = scaledWilliamsR.map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      williamsRSeries.setData(williamsRData);
      seriesMap.set('Williams%R', williamsRSeries);
    }
    
    if (activeIndicators.has('CCI')) {
      const cci = calculateCCI(highs, lows, closes);
      const scaledCCI = scaleCCIToPrice(cci, priceMin, priceMax);
      
      const cciSeries = chart.addLineSeries({
        color: '#795548',
        lineWidth: 2,
        title: 'CCI (Scaled)',
        priceLineVisible: false,
      });
      
      const cciData = scaledCCI.map((value, i) => ({
        time: times[i],
        value: isNaN(value) ? null : value
      })).filter(d => d.value !== null) as LineData[];
      
      cciSeries.setData(cciData);
      seriesMap.set('CCI', cciSeries);
    }
    
    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [activeIndicators, timeframe]);
  
  const toggleIndicator = (indicator: string) => {
    const newActiveIndicators = new Set(activeIndicators);
    if (newActiveIndicators.has(indicator)) {
      newActiveIndicators.delete(indicator);
    } else {
      newActiveIndicators.add(indicator);
    }
    setActiveIndicators(newActiveIndicators);
  };
  
  return (
    <div className="w-full min-h-screen bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">All-in-One Crypto Trading Chart</h1>
          <p className="text-gray-400">BTC/USDT with All Technical Indicators on Single Chart</p>
        </div>
        
        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Timeframe Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-white font-medium">Timeframe:</span>
              <div className="flex space-x-1">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      timeframe === tf
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Indicator Toggles */}
            <div className="flex items-center space-x-2">
              <span className="text-white font-medium">Indicators:</span>
              <div className="flex flex-wrap gap-2">
                {indicators.map((indicator) => (
                  <button
                    key={indicator}
                    onClick={() => toggleIndicator(indicator)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      activeIndicators.has(indicator)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {indicator}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Chart Container */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div 
            ref={chartContainerRef}
            className="w-full"
            style={{ minHeight: '700px' }}
          />
        </div>
        
        {/* Legend */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-bold mb-3">Active Indicators (All Overlaid)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
            {Array.from(activeIndicators).map((indicator) => (
              <div key={indicator} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  indicator === 'RSI' ? 'bg-red-400' :
                  indicator === 'EMA20' ? 'bg-blue-400' :
                  indicator === 'EMA50' ? 'bg-red-500' :
                  indicator === 'SMA10' ? 'bg-yellow-400' :
                  indicator === 'BBands' ? 'bg-purple-400' :
                  indicator === 'MACD' ? 'bg-cyan-400' :
                  indicator === 'ATR' ? 'bg-orange-400' :
                  indicator === 'Stoch' ? 'bg-green-400' :
                  indicator === 'Williams%R' ? 'bg-pink-400' :
                  indicator === 'CCI' ? 'bg-amber-600' :
                  'bg-gray-400'
                }`} />
                <span className="text-gray-300">{indicator}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Info Panel */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-bold mb-3">Single Chart Integration</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <h4 className="font-semibold text-white mb-2">Price Overlay Indicators:</h4>
              <ul className="space-y-1">
                <li>• EMA 20/50 - Exponential Moving Averages</li>
                <li>• SMA 10 - Simple Moving Average</li>
                <li>• Bollinger Bands (20,2) - Volatility bands</li>
                <li>• ATR - Average True Range (scaled)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Scaled Oscillators:</h4>
              <ul className="space-y-1">
                <li>• RSI (14) - Scaled to bottom area</li>
                <li>• MACD (12,26,9) - Scaled to top area</li>
                <li>• Stochastic %K/%D - Scaled to bottom area</li>
                <li>• Williams %R - Scaled oscillator</li>
                <li>• CCI - Commodity Channel Index (scaled)</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-700 rounded">
            <h4 className="font-semibold text-white mb-2">How It Works:</h4>
            <p className="text-sm text-gray-300">
              All oscillator indicators (RSI, MACD, Stochastic, etc.) are mathematically scaled to fit within the price chart range. 
              This allows you to see all technical analysis tools on a single chart while maintaining the relationships between price action and indicators. 
              Oscillators are positioned in different areas of the chart to avoid overlap.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CryptoTradingChart;