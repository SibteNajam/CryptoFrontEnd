// "use client";
// import { createExchangeService, ExchangeService } from '@/infrastructure/api/exchnages/ExchangeFactory';
// import { useMemo, useCallback, useState } from 'react';
// import { useAppSelector } from '@/infrastructure/store/hooks';
// import { getCredentials } from '@/infrastructure/features/exchange/exchangeSlice';
// import { NormalizedAccountInfo } from '@/infrastructure/api/exchnages/BaseExchangeService';

// type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

// export const useExchange = () => {
//   const selectedExchange = useAppSelector((state) => state.exchange.selectedExchange);
//   const credentials = useAppSelector(getCredentials); // Gets credentials for selected exchange
//   const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

//   // Credentials are already filtered for the selected exchange by the selector
//   const currentExchangeConfig = credentials;

//   // Create exchange service with memoization
//   const exchangeService: ExchangeService | null = useMemo(() => {
//     if (!currentExchangeConfig?.apiKey || !currentExchangeConfig?.secretKey) {
//       return null;
//     }

//     try {
//       return createExchangeService(
//         selectedExchange,
//         currentExchangeConfig.apiKey,
//         currentExchangeConfig.secretKey
//       );
//     } catch (error) {
//       console.error('Failed to create exchange service:', error);
//       return null;
//     }
//   }, [selectedExchange, currentExchangeConfig]);

//   // Connect to exchange
//   const connectToExchange = useCallback(async (): Promise<boolean> => {
//     if (!exchangeService) {
//       console.error('No exchange service available');
//       setConnectionStatus('error');
//       return false;
//     }

//     try {
//       setConnectionStatus('connecting');
//       await exchangeService.connect();
//       setConnectionStatus('connected');
//       return true;
//     } catch (error) {
//       console.error('Failed to connect to exchange:', error);
//       setConnectionStatus('error');
//       return false;
//     }
//   }, [exchangeService]);

//   // Disconnect from exchange
//   const disconnectFromExchange = useCallback((): void => {
//     if (exchangeService) {
//       exchangeService.disconnect();
//       setConnectionStatus('disconnected');
//     }
//   }, [exchangeService]);

//   // Get account info with error handling
//   const getAccountInfo = useCallback(async (): Promise<NormalizedAccountInfo | null> => {
//     if (!exchangeService) {
//       console.error('No exchange service available');
//       return null;
//     }
    
//     if (connectionStatus !== 'connected') {
//       console.warn('Exchange not connected, attempting to connect...');
//       const connected = await connectToExchange();
//       if (!connected) {
//         return null;
//       }
//     }
    
//     try {
//       return await exchangeService.getAccountInfo();
//     } catch (error) {
//       console.error('Failed to get account info:', error);
//       setConnectionStatus('error');
//       return null;
//     }
//   }, [exchangeService, connectionStatus, connectToExchange]);

//   return {
//     // Current state
//     selectedExchange,
//     exchangeService,
//     currentExchangeConfig,
    
//     // Status checks
//     isConnected: connectionStatus === 'connected',
//     isConnecting: connectionStatus === 'connecting',
//     hasError: connectionStatus === 'error',
//     hasCredentials: !!(currentExchangeConfig?.apiKey && currentExchangeConfig?.secretKey),
    
//     // Actions
//     connectToExchange,
//     disconnectFromExchange,
//     getAccountInfo,
//   };
// };