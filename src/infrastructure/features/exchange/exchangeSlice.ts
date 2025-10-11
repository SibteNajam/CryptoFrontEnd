// store/slices/exchangeSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ExchangeType = 'binance' | 'bitget';

export interface ExchangeCredentials {
  apiKey: string;
  secretKey: string;
  passphrase?: string;
}

interface ExchangeConfig {
  name: ExchangeType;
  apiKey: string;
  secretKey: string;
  passphrase?: string;
  isConnected: boolean;
  lastConnected?: string;
}

interface ExchangeState {
  selectedExchange: ExchangeType;
  exchanges: Record<ExchangeType, ExchangeConfig>;
  isSetupModalOpen: boolean;
  connectionStatus: Record<ExchangeType, 'connected' | 'connecting' | 'disconnected' | 'error'>;
    currentService: any;
}

const initialState: ExchangeState = {
  selectedExchange: 'binance',
  exchanges: {
    binance: {
      name: 'binance',
      apiKey: '',
      secretKey: '',
      isConnected: false,
    },
    bitget: {
      name: 'bitget',
      apiKey: '',
      secretKey: '',
      passphrase: '',
      isConnected: false,
    },
  },
  isSetupModalOpen: false,
  connectionStatus: {
    binance: 'disconnected',
    bitget: 'disconnected',
  },
  currentService: null,
};
const exchangeSlice = createSlice({
  name: 'exchange',
  initialState,
  reducers: {
    setSelectedExchange: (state, action: PayloadAction<ExchangeType>) => {
      state.selectedExchange = action.payload;
    },
    setExchangeCredentials: (
      state,
      action: PayloadAction<{
        exchange: ExchangeType;
        apiKey: string;
        secretKey: string;
        passphrase?: string;
      }>
    ) => {
      const { exchange, apiKey, secretKey, passphrase } = action.payload;
      state.exchanges[exchange].apiKey = apiKey;
      state.exchanges[exchange].secretKey = secretKey;
      if (passphrase) state.exchanges[exchange].passphrase = passphrase;
    },
    setConnectionStatus: (
      state,
      action: PayloadAction<{
        exchange: ExchangeType;
        status: 'connected' | 'connecting' | 'disconnected' | 'error';
      }>
    ) => {
      const { exchange, status } = action.payload;
      state.connectionStatus[exchange] = status;
      state.exchanges[exchange].isConnected = status === 'connected';
      if (status === 'connected') {
        state.exchanges[exchange].lastConnected = new Date().toISOString();
      }
    },
    setCurrentService: (state, action: PayloadAction<any>) => {
      state.currentService = action.payload;
    },
    toggleSetupModal: (state) => {
      state.isSetupModalOpen = !state.isSetupModalOpen;
    },
  },
});

export const {
  setSelectedExchange,
  setExchangeCredentials,
  setConnectionStatus,
  setCurrentService,
  toggleSetupModal,
} = exchangeSlice.actions;

export default exchangeSlice.reducer;