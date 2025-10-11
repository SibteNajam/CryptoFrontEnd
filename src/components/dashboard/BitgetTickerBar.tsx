'use client';
import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Wifi,
  WifiOff,
  ChevronDown,
  Search,
  X,
} from 'lucide-react';

interface BitgetTickerData {
  symbol: string;
  ticker: {
    symbol: string;
    lastPrice: string;
    openPrice: string;
    highPrice: string;
    lowPrice: string;
    priceChange24h: string;
    bidPrice: string;
    askPrice: string;
    bidSize: string;
    askSize: string;
    baseVolume: string;
    quoteVolume: string;
    openUtc: string;
    changeUtc24h: string;
  };
  timestamp: string;
}

interface SymbolOption {
  symbol: string;
  price: string;
}

interface BitgetTickerBarProps {
  selectedSymbol: string;
  availableSymbols?: SymbolOption[];
  onSymbolChange?: (symbol: string) => void;
}

const BITGET_WS_URL = (process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000') + '/bitget';

export default function BitgetTickerBar({ selectedSymbol, availableSymbols = [], onSymbolChange }: BitgetTickerBarProps) {
  const [tickerData, setTickerData] = useState<BitgetTickerData | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | 'none'>('none');
  const socketRef = useRef<Socket | null>(null);

  // Connect to Bitget socket.io namespace once on mount
  useEffect(() => {
    // Prevent duplicate sockets
    if (socketRef.current) return;

    const socket = io(BITGET_WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      forceNew: true,
    });
    socketRef.current = socket;

    const onConnect = () => {
      try {
        setWsConnected(true);
        // Subscribe to currently selected symbol
        socket.emit('subscribe_symbol', { symbol: selectedSymbol });
      } catch (err) {
        console.error('BitgetTickerBar connect handler error', err);
      }
    };

    const onDisconnect = () => {
      try {
        setWsConnected(false);
      } catch (err) {
        console.error('BitgetTickerBar disconnect handler error', err);
      }
    };

    const onTicker = (data: BitgetTickerData) => {
      try {
        setTickerData(data);
      } catch (err) {
        console.error('BitgetTickerBar ticker handler error', err);
      }
    };

    const onStatus = (data: any) => {
      try {
        setWsConnected(data?.status === 'connected');
      } catch (err) {
        console.error('BitgetTickerBar status handler error', err);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('bitget_ticker_data', onTicker);
    socket.on('bitget_connection_status', onStatus);

    return () => {
      try {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('bitget_ticker_data', onTicker);
        socket.off('bitget_connection_status', onStatus);
        socket.disconnect();
      } catch (err) {
        console.error('BitgetTickerBar cleanup error', err);
      }
      socketRef.current = null;
    };
    // only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to symbol when changed
  useEffect(() => {
    if (socketRef.current && wsConnected) {
      try {
        socketRef.current.emit('subscribe_symbol', { symbol: selectedSymbol });
      } catch (err) {
        console.error('Failed to emit subscribe_symbol', err);
      }
    }
  }, [selectedSymbol, wsConnected]);
  // Filter symbols based on search
  const filteredSymbols = availableSymbols.filter((sym) =>
    sym.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSymbolSelect = (symbol: string) => {
    if (onSymbolChange) {
      onSymbolChange(symbol);
    }
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  // Precompute ticker-derived values (use safe defaults so hooks remain stable)
  const currentPrice = tickerData ? parseFloat(tickerData.ticker.lastPrice || '0') : 0;
  const openPrice = tickerData ? parseFloat(tickerData.ticker.openPrice || '0') : 0;
  const changeRaw = tickerData ? (tickerData.ticker.priceChange24h ?? tickerData.ticker.changeUtc24h ?? '0') : '0';
  const priceChangePercent = isNaN(Number(changeRaw)) ? 0 : Number(changeRaw) * 100;
  const priceChange = currentPrice - openPrice;
  const highPrice = tickerData ? parseFloat(tickerData.ticker.highPrice || '0') : 0;
  const lowPrice = tickerData ? parseFloat(tickerData.ticker.lowPrice || '0') : 0;
  const bidPrice = tickerData ? parseFloat(tickerData.ticker.bidPrice || '0') : 0;
  const askPrice = tickerData ? parseFloat(tickerData.ticker.askPrice || '0') : 0;
  const baseVolume = tickerData ? parseFloat(tickerData.ticker.baseVolume || '0') : 0;
  const quoteVolume = tickerData ? parseFloat(tickerData.ticker.quoteVolume || '0') : 0;

  // Track price changes (guarded so it runs safely even when tickerData isn't available)
  useEffect(() => {
    if (tickerData == null) return;
    if (previousPrice !== null && currentPrice !== previousPrice) {
      setPriceFlash(currentPrice > previousPrice ? 'up' : 'down');
      const timer = setTimeout(() => setPriceFlash('none'), 500);
      return () => clearTimeout(timer);
    }
    setPreviousPrice(currentPrice);
  }, [currentPrice, previousPrice, tickerData]);

  const isPositive = priceChange >= 0;
  const baseAsset = selectedSymbol.replace('USDT', '').replace('BUSD', '').replace('USDC', '');

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(8);
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1000000000) return `${(vol / 1000000000).toFixed(2)}B`;
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(2)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const spread = askPrice - bidPrice;
  const spreadPercent = bidPrice ? (spread / bidPrice) * 100 : 0;

  return (
    <div className="bg-card border-b border-default shadow-sm">
      <div className="px-4 py-2">
        {/* Main Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted-dark rounded-lg border border-default transition-colors"
              >
                <span className="font-bold text-primary">{selectedSymbol}</span>
                <ChevronDown className={`h-4 w-4 text-secondary transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-card rounded-lg shadow-lg border border-default z-50">
                  <div className="p-2 border-b border-gray-100 scrollbar-hide">
                    <div className="relative scrollbar-hide">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search symbols..."
                        className="w-full pl-8 pr-8 py-2 text-sm border border-default rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-input text-card-foreground"
                        autoFocus
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-2.5"
                        >
                          <X className="h-4 w-4 text-muted-foreground hover:text-secondary" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Symbol List */}
                  <div className="max-h-80 overflow-y-auto scrollbar-hide">
                    {filteredSymbols.length > 0 ? (
                      filteredSymbols.map((sym) => (
                        <button
                          key={sym.symbol}
                          onClick={() => handleSymbolSelect(sym.symbol)}
                          className={`w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-50/10 transition-colors ${
                            sym.symbol === selectedSymbol ? 'bg-blue-50 dark:bg-blue-50/10 border-l-2 border-blue-500' : ''
                          }`}
                        >
                          <span className="font-medium text-primary">{sym.symbol}</span>
                          <span className="text-sm text-secondary">${parseFloat(sym.price).toFixed(4)}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-muted-foreground">No symbols found</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Current Price */}
            <div className={`text-2xl font-bold transition-all duration-300 ${
              priceFlash === 'up' ? 'text-green-600' : priceFlash === 'down' ? 'text-red-600' : isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              ${formatPrice(currentPrice)}
            </div>

            {/* Price Change */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold ${
              isPositive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span>{isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%</span>
            </div>
          </div>

          {/* Right Section - Status Indicators */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
              wsConnected ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{wsConnected ? 'Live' : 'Offline'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-secondary bg-muted px-2.5 py-1 rounded-md border border-default">
              <Clock className="h-3 w-3" />
              <span className="font-mono">{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-6 gap-4 text-xs">
          {/* 24h High/Low */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">24h High</span>
              <span className="font-semibold text-primary">${formatPrice(highPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">24h Low</span>
              <span className="font-semibold text-primary">${formatPrice(lowPrice)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vol({baseAsset})</span>
              <span className="font-semibold text-primary">{formatVolume(baseVolume)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Vol(USDT)</span>
              <span className="font-semibold text-primary">${formatVolume(quoteVolume)}</span>
            </div>
          </div>

          {/* Bid/Ask */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Bid</span>
              <span className="font-semibold text-green-600">${formatPrice(bidPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ask</span>
              <span className="font-semibold text-red-600">${formatPrice(askPrice)}</span>
            </div>
          </div>

          {/* Open Price */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Open</span>
              <span className="font-semibold text-primary">${formatPrice(openPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Change</span>
              <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>{isPositive ? '+' : ''}{formatPrice(Math.abs(priceChange))}</span>
            </div>
          </div>

          {/* Trades/Spread */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Spread</span>
              <span className="font-semibold text-primary">{spreadPercent.toFixed(3)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">—</span>
              <span className="font-semibold text-primary">—</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
