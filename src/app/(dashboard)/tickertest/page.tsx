'use client';

import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

// Backend 'ticker_data' payload shape
interface BackendTickerPayload {
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
    count: number | string;
  };
  timestamp?: string;
}

export default function LiveTicker() {
  const [symbol, setSymbol] = useState('');
  const [tickerData, setTickerData] = useState<BackendTickerPayload | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [message, setMessage] = useState('Not connected to server');

  // Hardcoded symbol list for quick selection
  const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'XRPUSDT'];

  console.log('Rendering LiveTicker with symbol:', symbol);
  useEffect(() => {
    const WS_URL = (process.env.NEXT_PUBLIC_WS_URL as string) || 'http://localhost:3000';
    const newSocket = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnectionStatus('Connected');
      setMessage('Connected to server');
    });

    newSocket.on('disconnect', (reason) => {
      setConnectionStatus('Disconnected');
      setMessage(`Disconnected: ${reason}`);
      setTickerData(null);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connect_error:', error);
      setConnectionStatus('Error');
      const errMsg = error && (error as any).message ? (error as any).message : String(error);
      setMessage(`Connection error: ${errMsg}`);
    });

    newSocket.on('reconnect_attempt', (attempt) => {
      setMessage(`Reconnection attempt ${attempt}`);
    });

    newSocket.on('reconnect_failed', () => {
      setMessage('Failed to reconnect. Please check server status.');
    });

    // Backend emits 'ticker_data' with a nested ticker object
    newSocket.on('ticker_data', (data: any) => {
      console.log('Received ticker_data', data);
      setTickerData(data);
    });

    newSocket.on('historical_candles_with_indicators', (payload) => {
      console.log('Received historical candles with indicators', payload);
    });

    newSocket.on('subscription_status', (payload) => {
      console.log('Subscription status:', payload);
      setMessage(`Subscription: ${payload.status || payload}`);
    });

    newSocket.on('subscription_error', (payload) => {
      console.error('Subscription error:', payload);
      setMessage(`Subscription error: ${payload.error || JSON.stringify(payload)}`);
    });

    newSocket.on('subscribed', ({ symbol, status }) => {
      setMessage(`Subscribed to ${symbol}: ${status}`);
    });

    newSocket.on('unsubscribed', ({ symbol, status }) => {
      setMessage(`Unsubscribed from ${symbol}: ${status}`);
      setTickerData(null);
    });

    return () => {
      newSocket.disconnect();
      setSocket(null);
    };
  }, []);

  // Auto-subscribe when symbol changes and socket is connected
  useEffect(() => {
    if (!socket) return;
    if (!symbol || connectionStatus !== 'Connected') return;

    const payload = { symbol: symbol.trim().toUpperCase(), interval: '1m', limit: 100 };
    console.log('Auto-subscribing to', payload.symbol);
    socket.emit('subscribe_symbol_with_indicators', payload);
    setMessage(`Subscribing to ${payload.symbol}...`);
    // clear previous ticker data while waiting for fresh data
    setTickerData(null);
  }, [socket, symbol, connectionStatus]);

  const handleSubscribe = () => {
    if (socket && symbol.trim()) {
      const payload = { symbol: symbol.trim().toUpperCase(), interval: '1m', limit: 100 };
      socket.emit('subscribe_symbol_with_indicators', payload);
      setMessage(`Subscribing to ${payload.symbol}...`);
    } else {
      setMessage('Please enter a valid symbol or ensure server connection');
    }
  };

  const handleUnsubscribe = () => {
    if (socket && symbol.trim()) {
      // backend does not expose a dedicated unsubscribe handler in the provided code,
      // emit a generic 'unsubscribe' event (server may ignore) and clear client state
      socket.emit('unsubscribe', { symbol: symbol.trim().toUpperCase() });
      setTickerData(null);
      setMessage(`Unsubscribed from ${symbol.trim().toUpperCase()}`);
    } else {
      setMessage('No symbol to unsubscribe from');
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Live Ticker Stream</h2>
      <div className="mb-4">
        <div className="mb-2">Select symbol:</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => setSymbol(s)}
              className={`px-3 py-1 rounded-md border ${symbol === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mb-2">Or enter symbol:</div>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Enter symbol (e.g., BTCUSDT)"
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mt-3 flex gap-3">
          <button
            onClick={() => setSymbol('')}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800"
          >
            Clear
          </button>
          <button
            onClick={handleUnsubscribe}
            className={`px-4 py-2 rounded-lg transition ${
              connectionStatus === 'Connected' && symbol.trim()
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
            disabled={connectionStatus !== 'Connected' || !symbol.trim()}
          >
            Unsubscribe
          </button>
        </div>
      </div>
      <p className={`mb-3 text-gray-600 ${connectionStatus === 'Error' ? 'text-red-600' : ''}`}>
        Status: {connectionStatus}
      </p>
      <p className="mb-3 text-gray-600">Message: {message}</p>
      {tickerData && (
        <div className="bg-gray-50 p-4 rounded-lg shadow-inner">
          <h3 className="font-semibold text-lg mb-2">Ticker: {tickerData.symbol.toUpperCase()}</h3>
          <p><span className="font-medium">Last Price:</span> {parseFloat(tickerData.ticker.lastPrice).toFixed(6)}</p>
          <p><span className="font-medium">Price Change:</span> {Number(tickerData.ticker.priceChange).toFixed(6)} ({Number(tickerData.ticker.priceChangePercent).toFixed(2)}%)</p>
          <p><span className="font-medium">Open:</span> {Number(tickerData.ticker.openPrice).toFixed(6)}</p>
          <p><span className="font-medium">High:</span> {Number(tickerData.ticker.highPrice).toFixed(6)}</p>
          <p><span className="font-medium">Low:</span> {Number(tickerData.ticker.lowPrice).toFixed(6)}</p>
          <p><span className="font-medium">Volume:</span> {Number(tickerData.ticker.volume).toLocaleString()}</p>
          <p><span className="font-medium">Quote Volume:</span> {Number(tickerData.ticker.quoteVolume).toLocaleString()}</p>
          <p><span className="font-medium">Bid Price:</span> {Number(tickerData.ticker.bidPrice).toFixed(6)}</p>
          <p><span className="font-medium">Ask Price:</span> {Number(tickerData.ticker.askPrice).toFixed(6)}</p>
          <p><span className="font-medium">Count:</span> {String(tickerData.ticker.count)}</p>
          {tickerData.timestamp && <p className="text-xs text-muted mt-2">Updated: {new Date(tickerData.timestamp).toLocaleTimeString()}</p>}
        </div>
      )}
    </div>
  );
}