import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Volume2,
  Activity,
  Clock,
  Wifi,
  WifiOff,
  Loader2,
  ChevronDown,
  Search,
  X
} from 'lucide-react';

interface SymbolOption {
  symbol: string;
  price: string;
}

interface TickerBarProps {
  selectedSymbol: string;
  tickerData: any;
  userBalance?: {
    free: string;
    locked: string;
  };
  wsConnected?: boolean;
  isLoading?: boolean;
  availableSymbols?: SymbolOption[];
  onSymbolChange?: (symbol: string) => void;
}

export default function TickerBar({ 
  selectedSymbol, 
  tickerData,
  userBalance,
  wsConnected = true,
  isLoading = false,
  availableSymbols = [],
  onSymbolChange
}: TickerBarProps) {
  
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | 'none'>('none');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);

  // Filter symbols based on search
  const filteredSymbols = availableSymbols.filter(sym => 
    sym.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading state
  if (isLoading || !tickerData) {
    return (
      <div className="bg-card border-b border-gray-200">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="animate-pulse flex items-center gap-4">
              <div className="h-7 bg-gray-200 rounded w-24"></div>
              <div className="h-7 bg-gray-200 rounded w-32"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="animate-pulse flex items-center gap-3">
              <div className="h-5 bg-gray-200 rounded w-16"></div>
              <div className="h-5 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentPrice = parseFloat(tickerData.ticker.lastPrice);
  const priceChange = parseFloat(tickerData.ticker.priceChange);
  const priceChangePercent = parseFloat(tickerData.ticker.priceChangePercent);
  const highPrice = parseFloat(tickerData.ticker.highPrice);
  const lowPrice = parseFloat(tickerData.ticker.lowPrice);
  const volume = parseFloat(tickerData.ticker.volume);
  const quoteVolume = parseFloat(tickerData.ticker.quoteVolume);
  const openPrice = parseFloat(tickerData.ticker.openPrice);
  const bidPrice = parseFloat(tickerData.ticker.bidPrice);
  const askPrice = parseFloat(tickerData.ticker.askPrice);
  const tradeCount = tickerData.ticker.count;

  // Track price changes
  useEffect(() => {
    if (previousPrice !== null && currentPrice !== previousPrice) {
      setPriceFlash(currentPrice > previousPrice ? 'up' : 'down');
      const timer = setTimeout(() => setPriceFlash('none'), 500);
      return () => clearTimeout(timer);
    }
    setPreviousPrice(currentPrice);
  }, [currentPrice, previousPrice]);

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
  const spreadPercent = (spread / bidPrice) * 100;

  const handleSymbolSelect = (symbol: string) => {
    if (onSymbolChange) {
      onSymbolChange(symbol);
    }
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="bg-card border-b border-gray-200 shadow-sm">
      <div className="px-4 py-2">
        {/* Main Header Row */}
        <div className="flex items-center justify-between mb-3">
          {/* Left Section - Symbol Selector, Price, Change */}
          <div className="flex items-center gap-4">
            {/* Symbol Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
              >
                <span className="font-bold text-gray-900">{selectedSymbol}</span>
                <ChevronDown className={`h-4 w-4 text-gray-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  {/* Search Input */}
                  <div className="p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search symbols..."
                        className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 top-2.5"
                        >
                          <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Symbol List */}
                  <div className="max-h-80 overflow-y-auto">
                    {filteredSymbols.length > 0 ? (
                      filteredSymbols.map((sym) => (
                        <button
                          key={sym.symbol}
                          onClick={() => handleSymbolSelect(sym.symbol)}
                          onMouseEnter={() => setHoveredSymbol(sym.symbol)}
                          onMouseLeave={() => setHoveredSymbol(null)}
                          className={`w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 transition-colors ${
                            sym.symbol === selectedSymbol ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                          }`}
                        >
                          <span className="font-medium text-gray-900">{sym.symbol}</span>
                          <span className="text-sm text-gray-600">${parseFloat(sym.price).toFixed(4)}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-gray-500">
                        No symbols found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Current Price */}
            <div className={`text-2xl font-bold transition-all duration-300 ${
              priceFlash === 'up' ? 'text-green-600' : 
              priceFlash === 'down' ? 'text-red-600' : 
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              ${formatPrice(currentPrice)}
            </div>

            {/* Price Change */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold ${
              isPositive 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              <span>{isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%</span>
            </div>
          </div>

          {/* Right Section - Status Indicators */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
              wsConnected 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {wsConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{wsConnected ? 'Live' : 'Offline'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
              <Clock className="h-3 w-3" />
              <span className="font-mono">{new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              })}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-6 gap-4 text-xs">
          {/* 24h High/Low */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">24h High</span>
              <span className="font-semibold text-gray-900">${formatPrice(highPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">24h Low</span>
              <span className="font-semibold text-gray-900">${formatPrice(lowPrice)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Vol({baseAsset})</span>
              <span className="font-semibold text-gray-900">{formatVolume(volume)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Vol(USDT)</span>
              <span className="font-semibold text-gray-900">${formatVolume(quoteVolume)}</span>
            </div>
          </div>

          {/* Bid/Ask */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Bid</span>
              <span className="font-semibold text-green-600">${formatPrice(bidPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Ask</span>
              <span className="font-semibold text-red-600">${formatPrice(askPrice)}</span>
            </div>
          </div>

          {/* Open Price */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Open</span>
              <span className="font-semibold text-gray-900">${formatPrice(openPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Change</span>
              <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{formatPrice(Math.abs(priceChange))}
              </span>
            </div>
          </div>

          {/* Trades Count */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Trades</span>
              <span className="font-semibold text-gray-900">{formatNumber(tradeCount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Spread</span>
              <span className="font-semibold text-gray-900">{spreadPercent.toFixed(3)}%</span>
            </div>
          </div>

          {/* User Balance */}
          {userBalance && (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Available</span>
                <span className="font-semibold text-gray-900">
                  {parseFloat(userBalance.free).toFixed(4)} {baseAsset}
                </span>
              </div>
              {parseFloat(userBalance.locked) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Locked</span>
                  <span className="font-semibold text-orange-600">
                    {parseFloat(userBalance.locked).toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}