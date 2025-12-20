import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { saveCredentialsToDatabase, getUserCredentials, CreateCredentialDto } from '@/infrastructure/api/CredentialsApi';
import { loginUser } from '@/infrastructure/features/auth/authSlice';

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
  configuredExchanges: string[]; // List of exchanges that have credentials configured
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
            configuredExchanges: state.configuredExchanges,
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
                configuredExchanges: state.configuredExchanges,
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
      configuredExchanges: [],
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
          configuredExchanges: parsedState.exchange.configuredExchanges || parsedState.auth?.user?.configured_exchanges || [],
          isSetupModalOpen: false, // Always start with modal closed
        };
      } else if (parsedState.auth?.user?.configured_exchanges) {
        // Fallback: use configured_exchanges from auth user if exchange state not saved
        console.log('🔄 Restoring configured exchanges from auth user in localStorage');
        return {
          selectedExchange: 'binance',
          credentialsArray: [],
          configuredExchanges: parsedState.auth.user.configured_exchanges,
          isSetupModalOpen: false,
        };
      }
    }
  } catch (error) {
    console.error('Error loading initial exchange state:', error);
  }

  return {
    selectedExchange: 'binance',
    credentialsArray: [],
    configuredExchanges: [],
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

export const fetchUserCredentials = createAsyncThunk(
  'exchange/fetchUserCredentials',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getUserCredentials();
      return response.data;
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
    setConfiguredExchanges(state, action: PayloadAction<string[]>) {
      state.configuredExchanges = action.payload;
      saveExchangeStateToLocalStorage(state);
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

        // Add to configuredExchanges if not present
        if (!state.configuredExchanges.includes(credentialsWithDbData.exchange)) {
          state.configuredExchanges.push(credentialsWithDbData.exchange);
        }

        saveExchangeStateToLocalStorage(state);
      })
      .addCase(fetchUserCredentials.fulfilled, (state, action) => {
        // Update configured exchanges list
        const configured = action.payload.map(cred => cred.exchange);
        state.configuredExchanges = configured;

        // Also update credentialsArray with the meta data (we don't get secrets back)
        // This keeps the UI in sync regarding labels, dates etc.
        action.payload.forEach(cred => {
          const exchangeType = cred.exchange as ExchangeType;
          const index = state.credentialsArray.findIndex(c => c.exchange === exchangeType);

          if (index !== -1) {
            // Update existing
            state.credentialsArray[index] = {
              ...state.credentialsArray[index],
              id: cred.id,
              isActive: cred.isActive,
              label: cred.label || state.credentialsArray[index].label,
              activeTrading: cred.activeTrading ?? state.credentialsArray[index].activeTrading,
            };
          } else {
            // Add new credential with placeholder keys (secrets are not returned by API)
            state.credentialsArray.push({
              exchange: exchangeType,
              apiKey: '*************', // Placeholder
              secretKey: '*************', // Placeholder
              label: cred.label || `${cred.exchange.toUpperCase()} Account`,
              activeTrading: cred.activeTrading ?? true,
              id: cred.id,
              isActive: cred.isActive,
            });
          }
        });

        saveExchangeStateToLocalStorage(state);
      })
      .addCase(saveCredentials.rejected, (state, action) => {
        console.error('❌ Failed to save credentials to database:', action.payload);
        // Note: Credentials are still stored in Redux even if DB save fails
        // This ensures the app still works, but user should be notified
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        // When user logs in, update the configured exchanges list from the user object
        if (action.payload.configuredExchanges && action.payload.configuredExchanges.length > 0) {
          console.log('🔄 Syncing configured exchanges from login:', action.payload.configuredExchanges);
          state.configuredExchanges = action.payload.configuredExchanges;
          saveExchangeStateToLocalStorage(state);
        }
      });
  },
});

export const {
  setSelectedExchange,
  setCredentials,
  clearCredentials,
  toggleSetupModal,
  setConfiguredExchanges,
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

export const getConfiguredExchanges = (state: { exchange: ExchangeState }) => state.exchange.configuredExchanges;

export const hasCredentialsForExchange = (exchange: ExchangeType) =>
  (state: { exchange: ExchangeState }) => {
    // Check if it's in the configured list
    return state.exchange.configuredExchanges.includes(exchange);
  };
