import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { saveCredentialsToDatabase, CreateCredentialDto } from '@/infrastructure/api/CredentialsApi';

export type ExchangeType = 'binance' | 'bitget';

export interface ExchangeCredentials {
  exchange: ExchangeType;
  apiKey: string;
  secretKey: string;
  passphrase?: string; // Optional, used by Bitget
  label: string;
  activeTrading: boolean;
  id?: string; // Database ID
  isActive?: boolean; // Database active status
}

interface ExchangeState {
  selectedExchange: ExchangeType;
  credentialsArray: ExchangeCredentials[]; // Array of credentials, one per exchange
  isSetupModalOpen: boolean;
}

// Helper function to save exchange state to localStorage
const saveExchangeStateToLocalStorage = (state: ExchangeState) => {
  if (typeof window !== 'undefined') {
    try {
      const TokenStorage = require('@/lib/tokenStorage').default;
      const token = TokenStorage.getAccessToken();
      
      if (token) {
        // Get current saved state and update only the exchange part
        const existingState = localStorage.getItem('reduxState');
        let stateToSave = {
          auth: { user: null, isAuthenticated: true },
          exchange: {
            selectedExchange: state.selectedExchange,
            credentialsArray: state.credentialsArray,
          },
        };
        
        if (existingState) {
          try {
            const parsed = JSON.parse(existingState);
            stateToSave = {
              ...parsed,
              exchange: {
                selectedExchange: state.selectedExchange,
                credentialsArray: state.credentialsArray,
              },
            };
          } catch (e) {
            // If parsing fails, use the default structure
          }
        }
        
        localStorage.setItem('reduxState', JSON.stringify(stateToSave));
        console.log('💾 Exchange state saved to localStorage');
      }
    } catch (error) {
      console.error('❌ Error saving exchange state to localStorage:', error);
    }
  }
};

// Load initial state from localStorage
const loadInitialState = (): ExchangeState => {
  if (typeof window === 'undefined') {
    return {
      selectedExchange: 'binance',
      credentialsArray: [],
      isSetupModalOpen: false,
    };
  }

  try {
    const savedState = localStorage.getItem('reduxState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      if (parsedState.exchange) {
        console.log('🔄 Restoring exchange state from localStorage');
        return {
          selectedExchange: parsedState.exchange.selectedExchange || 'binance',
          credentialsArray: (parsedState.exchange.credentialsArray || []).map((cred: ExchangeCredentials) => ({
            ...cred,
            activeTrading: cred.activeTrading ?? true,
          })),
          isSetupModalOpen: false, // Always start with modal closed
        };
      }
    }
  } catch (error) {
    console.error('Error loading initial exchange state:', error);
  }

  return {
    selectedExchange: 'binance',
    credentialsArray: [],
    isSetupModalOpen: false,
  };
};

const initialState: ExchangeState = loadInitialState();

// Async thunks
export const saveCredentials = createAsyncThunk(
  'exchange/saveCredentials',
  async (credentials: ExchangeCredentials, { rejectWithValue }) => {
    console.log('🚀 saveCredentials thunk called with:', credentials.exchange);
    try {
      const normalizedCredentials: ExchangeCredentials = {
        ...credentials,
        activeTrading: credentials.activeTrading ?? true,
      };

      const credentialData: CreateCredentialDto = {
        exchange: normalizedCredentials.exchange,
        apiKey: normalizedCredentials.apiKey,
        secretKey: normalizedCredentials.secretKey,
        passphrase: normalizedCredentials.passphrase,
        label: normalizedCredentials.label || `${normalizedCredentials.exchange.toUpperCase()} Account`,
        activeTrading: normalizedCredentials.activeTrading,
      };

      console.log('📤 Calling saveCredentialsToDatabase...');
      const response = await saveCredentialsToDatabase(credentialData);
      console.log('📥 Database response received:', response);
      return { credentials: normalizedCredentials, dbResponse: response };
    } catch (error: any) {
      console.error('💥 saveCredentials thunk error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const getDecryptedCredentials = createAsyncThunk(
  'exchange/getDecryptedCredentials',
  async (exchange: ExchangeType, { rejectWithValue }) => {
    try {
      // For now, just return null since we removed the API function
      // This can be implemented later if needed
      return { exchange, credentials: null };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const exchangeSlice = createSlice({
  name: 'exchange',
  initialState,
  reducers: {
    setSelectedExchange(state, action: PayloadAction<ExchangeType>) {
      state.selectedExchange = action.payload;
      saveExchangeStateToLocalStorage(state);
    },
    setCredentials(state, action: PayloadAction<ExchangeCredentials>) {
      const credentialWithDefaults: ExchangeCredentials = {
        ...action.payload,
        activeTrading: action.payload.activeTrading ?? true,
      };

      // Find if credentials for this exchange already exist
      const existingIndex = state.credentialsArray.findIndex(
        cred => cred.exchange === credentialWithDefaults.exchange
      );
      
      if (existingIndex !== -1) {
        // Update existing credentials
        state.credentialsArray[existingIndex] = credentialWithDefaults;
      } else {
        // Add new credentials
        state.credentialsArray.push(credentialWithDefaults);
      }

      saveExchangeStateToLocalStorage(state);
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

      saveExchangeStateToLocalStorage(state);
    },
    toggleSetupModal(state) {
      state.isSetupModalOpen = !state.isSetupModalOpen;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveCredentials.fulfilled, (state, action) => {
        console.log('✅ Credentials saved to database:', action.payload.dbResponse);
        // Update Redux state with the credentials including database response data
        const credentialsWithDbData = {
          ...action.payload.credentials,
          id: action.payload.dbResponse.data.id,
          isActive: action.payload.dbResponse.data.isActive,
          activeTrading: action.payload.dbResponse.data.activeTrading ?? action.payload.credentials.activeTrading,
        };
        
        const existingIndex = state.credentialsArray.findIndex(
          cred => cred.exchange === credentialsWithDbData.exchange
        );
        
        if (existingIndex !== -1) {
          state.credentialsArray[existingIndex] = credentialsWithDbData;
        } else {
          state.credentialsArray.push(credentialsWithDbData);
        }

        saveExchangeStateToLocalStorage(state);
      })
      .addCase(saveCredentials.rejected, (state, action) => {
        console.error('❌ Failed to save credentials to database:', action.payload);
        // Note: Credentials are still stored in Redux even if DB save fails
        // This ensures the app still works, but user should be notified
      });
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
