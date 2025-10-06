'use client';

import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';

interface TickerData {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  p: string; // Price change
  P: string; // Price change percent
  w: string; // Weighted average price
  c: string; // Last price
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
}

export default function LiveTicker() {
  const [symbol, setSymbol] = useState('');
  const [tickerData, setTickerData] = useState<TickerData | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [message, setMessage] = useState('Not connected to server');

  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
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
      setConnectionStatus('Error');
      setMessage(`Connection error: ${error.message}`);
    });

    newSocket.on('reconnect_attempt', (attempt) => {
      setMessage(`Reconnection attempt ${attempt}`);
    });

    newSocket.on('reconnect_failed', () => {
      setMessage('Failed to reconnect. Please check server status.');
    });

    newSocket.on('ticker', (data: TickerData) => {
      setTickerData(data);
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

  const handleSubscribe = () => {
    if (socket && symbol.trim()) {
      socket.emit('subscribe', symbol.trim().toLowerCase());
    } else {
      setMessage('Please enter a valid symbol or ensure server connection');
    }
  };

  const handleUnsubscribe = () => {
    if (socket && symbol.trim()) {
      socket.emit('unsubscribe', symbol.trim().toLowerCase());
    } else {
      setMessage('No symbol to unsubscribe from');
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Live Ticker Stream</h2>
      <div className="mb-4">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Enter symbol (e.g., btcusdt)"
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mt-3 flex gap-3">
          <button
            onClick={handleSubscribe}
            className={`px-4 py-2 rounded-lg transition ${
              connectionStatus === 'Connected' && symbol.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
            disabled={connectionStatus !== 'Connected' || !symbol.trim()}
          >
            Subscribe
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
          <h3 className="font-semibold text-lg mb-2">Ticker: {tickerData.s.toUpperCase()}</h3>
          <p><span className="font-medium">Last Price:</span> {parseFloat(tickerData.c).toFixed(2)}</p>
          <p>
            <span className="font-medium">Price Change:</span> {parseFloat(tickerData.p).toFixed(4)} (
            {parseFloat(tickerData.P).toFixed(2)}%)
          </p>
          <p><span className="font-medium">Open:</span> {parseFloat(tickerData.o).toFixed(2)}</p>
          <p><span className="font-medium">High:</span> {parseFloat(tickerData.h).toFixed(2)}</p>
          <p><span className="font-medium">Low:</span> {parseFloat(tickerData.l).toFixed(2)}</p>
          <p><span className="font-medium">Volume:</span> {parseFloat(tickerData.v).toFixed(2)}</p>
          <p><span className="font-medium">Quote Volume:</span> {parseFloat(tickerData.q).toFixed(2)}</p>
          <p><span className="font-medium">Weighted Avg:</span> {parseFloat(tickerData.w).toFixed(4)}</p>
        </div>
      )}
    </div>
  );
}