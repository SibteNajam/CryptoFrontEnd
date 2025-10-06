"use client";
import { setConnectionStatus } from '@/infrastructure/features/exchange/exchangeSlice';
import { createExchangeService, ExchangeService } from '@/infrastructure/api/exchnages/ExchangeFactory';
import { useMemo, useCallback, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/infrastructure/store/hooks';
import { NormalizedAccountInfo } from '@/infrastructure/api/exchnages/BaseExchangeService';

export const useExchange = () => {
  const dispatch = useAppDispatch();
  const { selectedExchange, exchanges, connectionStatus } = useAppSelector((state) => state.exchange);

  const currentExchangeConfig = exchanges[selectedExchange];
  console.log('Current Exchange Config:', currentExchangeConfig);

  // Create exchange service with memoization
  const exchangeService: ExchangeService | null = useMemo(() => {
    if (!currentExchangeConfig?.apiKey || !currentExchangeConfig?.secretKey) {
      return null;
    }

    try {
      return createExchangeService(
        selectedExchange,
        currentExchangeConfig.apiKey,
        currentExchangeConfig.secretKey,
        currentExchangeConfig.passphrase
      );
    } catch (error) {
      console.error('Failed to create exchange service:', error);
      return null;
    }
  }, [selectedExchange, currentExchangeConfig]);

  // Connection management
  const updateConnectionStatus = useCallback((status: 'connected' | 'connecting' | 'disconnected' | 'error') => {
    dispatch(setConnectionStatus({
      exchange: selectedExchange,
      status,
    }));
  }, [dispatch, selectedExchange]);

  // Connect to exchange
  const connectToExchange = useCallback(async (): Promise<boolean> => {
    if (!exchangeService) {
      console.error('No exchange service available');
      updateConnectionStatus('error');
      return false;
    }

    try {
      updateConnectionStatus('connecting');
      await exchangeService.connect();
      updateConnectionStatus('connected');
      return true;
    } catch (error) {
      console.error('Failed to connect to exchange:', error);
      updateConnectionStatus('error');
      return false;
    }
  }, [exchangeService, updateConnectionStatus]);

  // Disconnect from exchange
  const disconnectFromExchange = useCallback((): void => {
    if (exchangeService) {
      exchangeService.disconnect();
      updateConnectionStatus('disconnected');
    }
  }, [exchangeService, updateConnectionStatus]);

  // Get account info with error handling
  const getAccountInfo = useCallback(async (): Promise<NormalizedAccountInfo | null> => {
    if (!exchangeService) {
      console.error('No exchange service available');
      return null;
    }
     if (connectionStatus[selectedExchange] !== 'connected') {
      console.warn('Exchange not connected, attempting to connect...');
      const connected = await connectToExchange();
      if (!connected) {
        return null;
      }
    }
    try {
      return await exchangeService.getAccountInfo();
    } catch (error) {
      console.error('Failed to get account info:', error);
      updateConnectionStatus('error');
      return null;
    }
  }, [exchangeService, updateConnectionStatus, connectionStatus, selectedExchange, connectToExchange]);


  // Auto-disconnect when credentials are removed

    useEffect(() => {
    if (!currentExchangeConfig?.apiKey && connectionStatus[selectedExchange] !== 'disconnected') {
      updateConnectionStatus('disconnected');
    }
  }, [currentExchangeConfig?.apiKey, connectionStatus, selectedExchange, updateConnectionStatus]);
  return {
    // Current state
    selectedExchange,
    exchangeService,
    currentExchangeConfig,
    
    // Status checks
    isConnected: connectionStatus[selectedExchange] === 'connected',
    isConnecting: connectionStatus[selectedExchange] === 'connecting',
    hasError: connectionStatus[selectedExchange] === 'error',
    hasCredentials: !!(currentExchangeConfig?.apiKey && currentExchangeConfig?.secretKey),
    
    // Actions
    connectToExchange,
    disconnectFromExchange,
    getAccountInfo,
    updateConnectionStatus,
  };
};