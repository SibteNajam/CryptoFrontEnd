import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import TradingBotApi, { TradingConfig, TradingStats } from '@/infrastructure/api/TradingBotApi';

interface TradingBotState {
  // Exchange state
  activeExchange: string | null;
  isConfigured: boolean;
  credentialsSet: boolean;
  
  // Trading configuration
  config: TradingConfig | null;
  
  // Statistics
  stats: TradingStats | null;
  processingSymbol: string | null;
  processingStatus: 'idle' | 'vlm_processing' | 'order_placing' | 'completed' | 'vlm_failed';
  queueSize: number;
  
  // UI state
  loading: boolean;
  error: string | null;
  lastSynced: number | null;
  
  // Auto-sync flag
  needsSync: boolean;
}

const initialState: TradingBotState = {
  activeExchange: null,
  isConfigured: false,
  credentialsSet: false,
  config: null,
  stats: null,
  processingSymbol: null,
  processingStatus: 'idle',
  queueSize: 0,
  loading: false,
  error: null,
  lastSynced: null,
  needsSync: true,
};

// Async thunks
export const initializeExchange = createAsyncThunk(
  'tradingBot/initializeExchange',
  async ({ exchange, credentials }: { exchange: 'bitget' | 'binance'; credentials: any }, { rejectWithValue }) => {
    try {
      const response = await TradingBotApi.initializeExchange({
        api_key: credentials.apiKey,
        passphrase: credentials.passphrase,
        secret: credentials.secretKey,
        exchange,
      });
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchActiveExchange = createAsyncThunk(
  'tradingBot/fetchActiveExchange',
  async (_, { rejectWithValue }) => {
    try {
      return await TradingBotApi.getActiveExchange();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updateTradingConfig = createAsyncThunk(
  'tradingBot/updateConfig',
  async (config: TradingConfig, { rejectWithValue }) => {
    try {
      const response = await TradingBotApi.updateTradingConfig(config);
      return response.config;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchTradingConfig = createAsyncThunk(
  'tradingBot/fetchConfig',
  async (_, { rejectWithValue }) => {
    try {
      return await TradingBotApi.getTradingConfig();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchStats = createAsyncThunk(
  'tradingBot/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      return await TradingBotApi.getStats();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchProcessingStatus = createAsyncThunk(
  'tradingBot/fetchProcessingStatus',
  async (_, { rejectWithValue }) => {
    try {
      return await TradingBotApi.getProcessingStatus();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const resetStartBalance = createAsyncThunk(
  'tradingBot/resetStartBalance',
  async (_, { rejectWithValue }) => {
    try {
      return await TradingBotApi.resetStartBalance();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const tradingBotSlice = createSlice({
  name: 'tradingBot',
  initialState,
  reducers: {
    setNeedsSync(state, action: PayloadAction<boolean>) {
      state.needsSync = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Initialize Exchange
    builder
      .addCase(initializeExchange.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeExchange.fulfilled, (state, action) => {
        state.loading = false;
        state.activeExchange = action.payload.active_exchange;
        state.isConfigured = action.payload.success;
        state.credentialsSet = action.payload.credentials_configured;
        state.lastSynced = Date.now();
        state.needsSync = false;
        if (action.payload.start_balance && state.stats) {
          state.stats.start_balance = action.payload.start_balance;
        }
      })
      .addCase(initializeExchange.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.needsSync = true;
      });

    // Fetch Active Exchange
    builder
      .addCase(fetchActiveExchange.fulfilled, (state, action) => {
        state.activeExchange = action.payload.exchange;
        state.isConfigured = action.payload.is_configured;
        state.credentialsSet = action.payload.credentials_set;
      });

    // Update Trading Config
    builder
      .addCase(updateTradingConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTradingConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.config = action.payload;
      })
      .addCase(updateTradingConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Trading Config
    builder
      .addCase(fetchTradingConfig.fulfilled, (state, action) => {
        state.config = action.payload;
      });

    // Fetch Stats
    builder
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
        state.processingSymbol = action.payload.processing_symbol;
        state.queueSize = action.payload.queue_size;
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    // Fetch Processing Status
    builder
      .addCase(fetchProcessingStatus.fulfilled, (state, action) => {
        state.processingSymbol = action.payload.processing_symbol;
        state.processingStatus = action.payload.processing_status;
        state.queueSize = action.payload.queue_size;
      });

    // Reset Start Balance
    builder
      .addCase(resetStartBalance.fulfilled, (state, action) => {
        if (state.stats) {
          state.stats.start_balance = action.payload.start_balance;
          state.stats.current_balance = action.payload.current_balance;
          state.stats.profit = 0;
        }
      });
  },
});

export const { setNeedsSync, clearError } = tradingBotSlice.actions;

export default tradingBotSlice.reducer;
