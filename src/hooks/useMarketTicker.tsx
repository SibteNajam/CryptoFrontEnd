import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type ExchangeType = 'binance' | 'bitget';

const DEFAULT_API = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

function normalizeBitgetToBinanceShape(bit: any) {
  // bit is expected to have fields like instId, lastPr, high24h, low24h, change24h, bidPr, askPr, baseVolume, quoteVolume, ts
  const instId = bit.instId || bit.symbol || '';
  const lastPrice = bit.lastPr || bit.lastPrice || '0';
  const priceChange = bit.change24h || bit.changeUtc24h || '0';
  const priceChangePercent = bit.change24h || '0';

  return {
    symbol: instId,
    ticker: {
      symbol: instId,
      lastPrice: String(lastPrice),
      priceChange: String(priceChange),
      priceChangePercent: String(priceChangePercent),
      highPrice: String(bit.high24h || bit.highPrice || '0'),
      lowPrice: String(bit.low24h || bit.lowPrice || '0'),
      openPrice: String(bit.open24h || bit.openPrice || '0'),
      volume: String(bit.baseVolume || bit.volume || '0'),
      quoteVolume: String(bit.quoteVolume || '0'),
      bidPrice: String(bit.bidPr || bit.bidPrice || '0'),
      askPrice: String(bit.askPr || bit.askPrice || '0'),
      count: bit.count || 0,
    },
  } as any;
}

export default function useMarketTicker(
  selectedExchange: ExchangeType,
  symbol: string,
  interval: string
) {
  const socketRef = useRef<Socket | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const [tickerData, setTickerData] = useState<any | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected');

  // Subscribe function used by UI to request a new symbol
  const subscribeSymbol = async (newSymbol: string, newInterval?: string) => {
    if (selectedExchange === 'binance') {
      // emit via socket.io
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('subscribe_symbol_with_indicators', {
          symbol: newSymbol,
          interval: newInterval || interval,
          limit: 1000,
        });
      }
    } else if (selectedExchange === 'bitget') {
      // Bitget: emit directly to the Bitget socket namespace (no backend POST required)
      try {
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('subscribe_symbol', { symbol: newSymbol });
          setConnectionStatus('connected');
        } else {
          // if socket not yet ready, set status to connecting and the socket's connect handler will subscribe
          setConnectionStatus('connecting');
          console.debug('subscribeSymbol: bitget socket not ready yet, will subscribe on connect');
        }
      } catch (err) {
        console.error('Error emitting subscribe_symbol to bitget socket', err);
        setConnectionStatus('error');
      }
    }
  };

  useEffect(() => {
    // Clean previous connections whenever exchange changes
    return () => {
      // cleanup on unmount handled below
    };
  }, [selectedExchange]);

  useEffect(() => {
    // initialize when selectedExchange changes
    setTickerData(null);
    setWsConnected(false);
    setConnectionStatus('disconnected');

    // Cleanup helpers
    const cleanupSocket = () => {
      if (socketRef.current) {
        try {
          socketRef.current.off('connect');
          socketRef.current.off('disconnect');
          socketRef.current.off('connect_error');
          socketRef.current.off('ticker_data');
          socketRef.current.off('binance_connection_status');
          socketRef.current.disconnect();
        } catch (e) {
          // ignore
        }
        socketRef.current = null;
      }
    };

    const cleanupEs = () => {
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch (e) {
          // ignore
        }
        esRef.current = null;
      }
    };

    if (selectedExchange === 'binance') {
      // socket.io connection
      const WS_URL = process.env.NEXT_PUBLIC_WS_URL || DEFAULT_API;
      const socket = io(WS_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        forceNew: true,
      });
      socketRef.current = socket;
      setConnectionStatus('connecting');

      socket.on('connect', () => {
        setWsConnected(true);
        setConnectionStatus('connected');
        console.log('useMarketTicker: socket connected (binance)');
        // Subscribe to current symbol
        if (symbol) {
          socket.emit('subscribe_symbol_with_indicators', {
            symbol,
            interval,
            limit: 1000,
          });
        }
      });

      socket.on('connect_error', (err: any) => {
        console.error('Socket connect_error', err);
        setWsConnected(false);
        setConnectionStatus('error');
        console.log('useMarketTicker: socket connect_error (binance) ->', err?.message || err);
      });

      socket.on('disconnect', () => {
        setWsConnected(false);
        setConnectionStatus('disconnected');
        console.log('useMarketTicker: socket disconnected (binance)');
      });

      socket.on('binance_connection_status', (d: any) => {
        // optional
        console.debug('binance_connection_status', d);
      });

      socket.on('ticker_data', (data: any) => {
        // Expect backend to send Binance-shaped payload (symbol + ticker)
        console.log('useMarketTicker: received ticker_data (binance):', data?.symbol || data?.ticker?.symbol);
        setTickerData(data);
      });

      return () => {
        cleanupSocket();
      };
    } else if (selectedExchange === 'bitget') {
      // Connect directly to the Bitget socket.io namespace
      const WS_URL = process.env.NEXT_PUBLIC_WS_URL || DEFAULT_API;
      const bitgetUrl = `${WS_URL.replace(/\/+$/, '')}/bitget`;
      const socket = io(bitgetUrl, {
        transports: ['websocket'],
        reconnection: true,
        forceNew: true,
      });
      socketRef.current = socket;
      setConnectionStatus('connecting');

      socket.on('connect', () => {
        setWsConnected(true);
        setConnectionStatus('connected');
        console.log('useMarketTicker: bitget socket connected', bitgetUrl);
        // Subscribe to current symbol if provided
        if (symbol) {
          try {
            socket.emit('subscribe_symbol', { symbol });
          } catch (err) {
            console.error('useMarketTicker: failed to emit subscribe_symbol on connect', err);
          }
        }
      });

      socket.on('disconnect', () => {
        setWsConnected(false);
        setConnectionStatus('disconnected');
        console.log('useMarketTicker: bitget socket disconnected');
      });

      socket.on('connect_error', (err: any) => {
        console.error('useMarketTicker: bitget connect_error', err);
        setWsConnected(false);
        setConnectionStatus('error');
      });

      socket.on('bitget_connection_status', (d: any) => {
        console.debug('bitget_connection_status', d);
        setWsConnected(d?.status === 'connected');
      });

      socket.on('bitget_ticker_data', (data: any) => {
        try {
          const normalized = normalizeBitgetToBinanceShape(data?.ticker ? { ...data.ticker, instId: data.symbol || data.instId } : data);
          console.log('useMarketTicker: received bitget_ticker_data for', normalized?.symbol || normalized?.ticker?.symbol);
          setTickerData(normalized);
        } catch (err) {
          console.error('useMarketTicker: failed to handle bitget_ticker_data', err);
        }
      });

      return () => {
        cleanupSocket();
      };
    }

    // fallback cleanup
    return () => {
      try {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      } catch (e) { }
      try {
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
        }
      } catch (e) { }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExchange]);

  // React to symbol or interval changes
  useEffect(() => {
    if (!symbol) return;
    if (selectedExchange === 'binance') {
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('subscribe_symbol_with_indicators', { symbol, interval, limit: 1000 });
      }
    } else if (selectedExchange === 'bitget') {
      // tell backend to switch symbol
      subscribeSymbol(symbol, interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval]);

  return {
    tickerData,
    wsConnected,
    connectionStatus,
    subscribeSymbol,
  };
}
