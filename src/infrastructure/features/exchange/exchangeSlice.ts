import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ExchangeType = 'binance' | 'bitget';

export interface ExchangeCredentials {
  exchange: ExchangeType;
  apiKey: string;
  secretKey: string;
  passphrase?: string; // Optional, used by Bitget
  label: string;
}

interface ExchangeState {
  selectedExchange: ExchangeType;
  credentialsArray: ExchangeCredentials[]; // Array of credentials, one per exchange
  isSetupModalOpen: boolean;
}

const initialState: ExchangeState = {
  selectedExchange: 'binance',
  credentialsArray: [],
  isSetupModalOpen: false,
};

const exchangeSlice = createSlice({
  name: 'exchange',
  initialState,
  reducers: {
    setSelectedExchange(state, action: PayloadAction<ExchangeType>) {
      state.selectedExchange = action.payload;
    },
    setCredentials(state, action: PayloadAction<ExchangeCredentials>) {
      // Find if credentials for this exchange already exist
      const existingIndex = state.credentialsArray.findIndex(
        cred => cred.exchange === action.payload.exchange
      );
      
      if (existingIndex !== -1) {
        // Update existing credentials
        state.credentialsArray[existingIndex] = action.payload;
      } else {
        // Add new credentials
        state.credentialsArray.push(action.payload);
      }
    },
    clearCredentials(state, action: PayloadAction<ExchangeType | undefined>) {
      if (action.payload) {
        // Clear credentials for specific exchange
        state.credentialsArray = state.credentialsArray.filter(
          cred => cred.exchange !== action.payload
        );
      } else {
        // Clear all credentials
        state.credentialsArray = [];
      }
    },
    toggleSetupModal(state) {
      state.isSetupModalOpen = !state.isSetupModalOpen;
    },
  },
});

export const {
  setSelectedExchange,
  setCredentials,
  clearCredentials,
  toggleSetupModal,
} = exchangeSlice.actions;

export default exchangeSlice.reducer;

// Selectors
export const getCredentials = (state: { exchange: ExchangeState }) => {
  const selectedExchange = state.exchange.selectedExchange;
  return state.exchange.credentialsArray.find(
    cred => cred.exchange === selectedExchange
  ) || null;
};

export const getAllCredentials = (state: { exchange: ExchangeState }) => 
  state.exchange.credentialsArray;

export const getCredentialsForExchange = (exchange: ExchangeType) => 
  (state: { exchange: ExchangeState }) => 
    state.exchange.credentialsArray.find(cred => cred.exchange === exchange) || null;

export const getSelectedExchange = (state: { exchange: ExchangeState }) => 
  state.exchange.selectedExchange;

export const hasCredentials = (state: { exchange: ExchangeState }) => {
  const creds = getCredentials(state);
  return !!(creds?.apiKey && creds?.secretKey);
};

export const hasCredentialsForExchange = (exchange: ExchangeType) => 
  (state: { exchange: ExchangeState }) => {
    const creds = state.exchange.credentialsArray.find(cred => cred.exchange === exchange);
    return !!(creds?.apiKey && creds?.secretKey);
  };