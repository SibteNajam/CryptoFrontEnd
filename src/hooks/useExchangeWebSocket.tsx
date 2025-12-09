'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '@/infrastructure/store/hooks';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://146.59.93.94:3000';

interface UseExchangeWebSocketProps {
  onTickerUpdate?: (data: any) => void;
  onOrderUpdate?: (data: any) => void;
  onConnectionStatus?: (status: string) => void;
}

export const useExchangeWebSocket = ({
  onTickerUpdate,
  onOrderUpdate,
  onConnectionStatus,
}: UseExchangeWebSocketProps = {}) => {
  const { selectedExchange } = useAppSelector((state) => state.exchange);
  
  const binanceSocketRef = useRef<Socket | null>(null);
  const bitgetSocketRef = useRef<Socket | null>(null);
  const currentExchangeRef = useRef<string | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const callbacksRef = useRef({ onTickerUpdate, onOrderUpdate, onConnectionStatus });

  // Update callbacks ref without triggering re-connection
  useEffect(() => {
    callbacksRef.current = { onTickerUpdate, onOrderUpdate, onConnectionStatus };
  }, [onTickerUpdate, onOrderUpdate, onConnectionStatus]);

  // Cleanup function for Binance WebSocket
  const disconnectBinance = useCallback(() => {
    if (binanceSocketRef.current) {
      console.log('🔴 UNSUBSCRIBE: Disconnecting Binance WebSocket...');
      binanceSocketRef.current.off(); // Remove all listeners
      binanceSocketRef.current.disconnect();
      binanceSocketRef.current = null;
      callbacksRef.current.onConnectionStatus?.('binance_disconnected');
    }
  }, []);

  // Cleanup function for Bitget WebSocket
  const disconnectBitget = useCallback(() => {
    if (bitgetSocketRef.current) {
      console.log('🔴 UNSUBSCRIBE: Disconnecting Bitget WebSocket...');
      bitgetSocketRef.current.off(); // Remove all listeners
      bitgetSocketRef.current.disconnect();
      bitgetSocketRef.current = null;
      callbacksRef.current.onConnectionStatus?.('bitget_disconnected');
    }
  }, []);

  // Connect to Binance WebSocket (ROOT NAMESPACE)
  const connectBinance = useCallback(() => {
    // Prevent duplicate connections
    if (binanceSocketRef.current?.connected) {
      console.log('✅ Binance WebSocket already connected, skipping...');
      return binanceSocketRef.current;
    }

    console.log('🟢 Connecting to Binance WebSocket (root namespace)...');
    
    const socket = io(API_BASE_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✅ Binance WebSocket connected');
      callbacksRef.current.onConnectionStatus?.('binance_connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ Bitget WebSocket disconnected:', reason);
      callbacksRef.current.onConnectionStatus?.('bitget_disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ BITGET WEBSOCKET ERROR - Connection Error:');
      console.error('❌ Full error:', error);
    });

    socket.on('connect_timeout', () => {
      console.error('⏰ BITGET WEBSOCKET ERROR - Connection Timeout');
    });

    socket.on('connection_status', (data) => {
      console.log('📡 Binance connection status:', data.message);
    });

    // Binance sends ticker data
    socket.on('ticker_data', (data) => {
      console.log('📊 Binance ticker update:', data.symbol);
      callbacksRef.current.onTickerUpdate?.(data);
    });

    // Binance connection status updates
    socket.on('binance_connection_status', (data) => {
      console.log('🔗 Binance status:', data.status);
      callbacksRef.current.onConnectionStatus?.(data.status);
    });

    // Binance kline data with indicators
    socket.on('kline_with_indicators', (data) => {
      console.log('📈 Binance kline with indicators:', data.symbol);
    });

    binanceSocketRef.current = socket;
    return socket;
  }, []);

  // Connect to Bitget WebSocket (/bitget NAMESPACE)
  const connectBitget = useCallback(() => {
    // Prevent duplicate connections
    if (bitgetSocketRef.current?.connected) {
      console.log('✅ Bitget WebSocket already connected, skipping...');
      return bitgetSocketRef.current;
    }

    console.log('🟢 Connecting to Bitget WebSocket (/bitget namespace)...');
    
    const socket = io(`${API_BASE_URL}/bitget`, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('✅ Bitget WebSocket connected');
      console.log(`🔗 Bitget socket ID: ${socket.id}`);
      callbacksRef.current.onConnectionStatus?.('bitget_connected');
      
      // Subscribe to order updates automatically
      console.log('📡 Subscribing to Bitget order updates...');
      socket.emit('subscribe_orders');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Bitget WebSocket connection error:', error);
    });

    socket.on('connect_timeout', () => {
      console.error('⏰ Bitget WebSocket connection timeout');
    });

    socket.on('connection_status', (data) => {
      console.log('📡 BITGET WEBSOCKET RESPONSE - General Connection Status:');
      console.log('📡 Full data:', JSON.stringify(data, null, 2));
    });

    // Bitget sends ticker data
    socket.on('bitget_ticker_data', (data) => {
      console.log('📊 BITGET WEBSOCKET RESPONSE - Ticker Data Received:');
      console.log('📊 Full data:', JSON.stringify(data, null, 2));
      console.log('📊 Symbol:', data.symbol);
      console.log('📊 Last Price:', data.ticker?.lastPrice);
      callbacksRef.current.onTickerUpdate?.(data);
    });

    // Bitget order updates
    socket.on('bitget_order_update', (data) => {
      console.log('📦 BITGET WEBSOCKET RESPONSE - Order Update Received:');
      console.log('📦 Full data:', JSON.stringify(data, null, 2));
      callbacksRef.current.onOrderUpdate?.(data);
    });

    // Bitget connection status updates
    socket.on('bitget_connection_status', (data) => {
      console.log('🔗 BITGET WEBSOCKET RESPONSE - Connection Status:');
      console.log('🔗 Full data:', JSON.stringify(data, null, 2));
      callbacksRef.current.onConnectionStatus?.(data.status);
    });

    socket.on('bitget_private_connection_status', (data) => {
      console.log('🔗 BITGET WEBSOCKET RESPONSE - Private Connection Status:');
      console.log('🔗 Full data:', JSON.stringify(data, null, 2));
    });

    socket.on('order_subscription_status', (data) => {
      console.log('✅ BITGET WEBSOCKET RESPONSE - Order Subscription Status:');
      console.log('✅ Full data:', JSON.stringify(data, null, 2));
    });

    socket.on('symbol_subscribed', (data) => {
      console.log('✅ BITGET WEBSOCKET RESPONSE - Symbol Subscribed:');
      console.log('✅ Full data:', JSON.stringify(data, null, 2));
    });

    bitgetSocketRef.current = socket;
    return socket;
  }, []);

  // Subscribe to Binance symbol with indicators
  const subscribeBinanceSymbol = useCallback((symbol: string, interval: string = '1m') => {
    console.log(`🔄 SUBSCRIBE REQUEST: Binance - Symbol: ${symbol}, Interval: ${interval}`);
    const socket = binanceSocketRef.current;
    
    if (!socket?.connected) {
      console.warn('⚠️ Binance socket not connected, connecting now...');
      const newSocket = connectBinance();
      
      // Wait for connection then subscribe
      newSocket?.once('connect', () => {
        console.log(`✅ SUBSCRIBED: Binance - Symbol: ${symbol}, Interval: ${interval} (after connection)`);
        newSocket.emit('subscribe_symbol_with_indicators', {
          symbol,
          interval,
          limit: 100,
        });
      });
      return;
    }

    console.log(`✅ SUBSCRIBED: Binance - Symbol: ${symbol}, Interval: ${interval}`);
    socket.emit('subscribe_symbol_with_indicators', {
      symbol,
      interval,
      limit: 100,
    });
  }, [connectBinance]);

  // Subscribe to Bitget symbol
  const subscribeBitgetSymbol = useCallback((symbol: string) => {
    console.log(`🔄 SUBSCRIBE REQUEST: Bitget - Symbol: ${symbol}`);
    const socket = bitgetSocketRef.current;
    
    console.log(`🔍 subscribeBitgetSymbol called with symbol: ${symbol}`);
    console.log(`🔍 Bitget socket connected: ${socket?.connected}`);
    console.log(`🔍 Bitget socket id: ${socket?.id}`);
    
    if (!socket?.connected) {
      console.warn('⚠️ Bitget socket not connected, connecting now...');
      const newSocket = connectBitget();
      
      // Wait for connection then subscribe
      newSocket?.once('connect', () => {
        console.log(`📡 Subscribing to Bitget symbol: ${symbol} (after connection)`);
        console.log(`📤 Emitting subscribe_symbol with payload:`, { symbol });
        console.log(`✅ SUBSCRIBED: Bitget - Symbol: ${symbol} (after connection)`);
        newSocket.emit('subscribe_symbol', { symbol });
      });
      return;
    }

    console.log(`📡 Subscribing to Bitget symbol: ${symbol}`);
    console.log(`📤 Emitting subscribe_symbol with payload:`, { symbol });
    console.log(`✅ SUBSCRIBED: Bitget - Symbol: ${symbol}`);
    socket.emit('subscribe_symbol', { symbol });
  }, [connectBitget]);

  // Main effect to handle exchange switching
  useEffect(() => {
    if (!selectedExchange) {
      console.log('⚠️ No exchange selected');
      return;
    }

    // Skip if already initialized with the same exchange
    if (isInitializedRef.current && currentExchangeRef.current === selectedExchange) {
      console.log(`✅ Already connected to ${selectedExchange}, skipping reconnection...`);
      return;
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔄 EXCHANGE CHANGE DETECTED');
    console.log('   Previous:', currentExchangeRef.current || 'none');
    console.log('   New:', selectedExchange);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // If switching exchanges, disconnect the old one first
    if (currentExchangeRef.current && currentExchangeRef.current !== selectedExchange) {
      console.log(`🔄 EXCHANGE SWITCH: Disconnecting ${currentExchangeRef.current} before connecting to ${selectedExchange}`);
      if (currentExchangeRef.current === 'binance') {
        disconnectBinance();
      } else if (currentExchangeRef.current === 'bitget') {
        disconnectBitget();
      }
    }

    // Connect to the new exchange
    if (selectedExchange === 'binance') {
      console.log('🔗 CONNECTING: Binance WebSocket');
      disconnectBitget(); // Ensure Bitget is disconnected
      connectBinance();
    } else if (selectedExchange === 'bitget') {
      console.log('🔗 CONNECTING: Bitget WebSocket');
      disconnectBinance(); // Ensure Binance is disconnected
      connectBitget();
    }

    currentExchangeRef.current = selectedExchange;
    isInitializedRef.current = true;

    // Cleanup on unmount
    return () => {
      console.log('🧹 Component unmounting - cleaning up WebSocket connections...');
      disconnectBinance();
      disconnectBitget();
      isInitializedRef.current = false;
    };
  }, [selectedExchange, connectBinance, connectBitget, disconnectBinance, disconnectBitget]);

  return {
    binanceSocket: binanceSocketRef.current,
    bitgetSocket: bitgetSocketRef.current,
    subscribeBinanceSymbol,
    subscribeBitgetSymbol,
    selectedExchange,
    isConnected: selectedExchange === 'binance' 
      ? binanceSocketRef.current?.connected 
      : bitgetSocketRef.current?.connected,
  };
};

