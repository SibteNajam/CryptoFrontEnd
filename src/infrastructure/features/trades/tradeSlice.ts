import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Trade from API
export interface TradeHistory {
  tradeId: string;
  orderId: string;
  symbol: string;
  side: string;
  price?: string;
  priceAvg?: string;
  amount?: string;
  size: string;
  feeDetail: any;
  cTime: string;
}

// Paired buy/sell group
export interface TradePair {
  buys: TradeHistory[];
  sells: TradeHistory[];
  pnl: number | null;
  pnlPercent: number | null;
  avgBuyPrice: number | null;
  totalBuySize: number | null;
  totalBuyCost: number | null;
  avgSellPrice: number | null;
  totalSellSize: number | null;
  totalSellRevenue: number | null;
}

// Symbol group with all its data (as shown in UI card)
export interface SymbolGroupData {
  symbol: string;
  trades: TradeHistory[];  // All trades for this symbol
  pairs: TradePair[];      // Paired trades
  totalBuys: number;
  totalSells: number;
  completedPairs: number;
  pendingBuys: number;
  unmatchedSells: number;
  mostRecentTimestamp: number;  // For sorting
}

export interface TradesState {
  tradeHistory: TradeHistory[];     // All sorted trades (most recent first)
  symbolGroups: SymbolGroupData[];  // Array sorted by most recent first (index 0 = latest)
  historyDays: number;
  lastFetchTime: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: TradesState = {
  tradeHistory: [],     // All sorted trades
  symbolGroups: [],     // Processed symbol groups
  historyDays: 20,
  lastFetchTime: null,
  loading: false,
  error: null,
};

const tradeSlice = createSlice({
  name: 'trades',
  initialState,
  reducers: {
    // Set all trade history (raw sorted trades)
    setTradeHistory: (state, action: PayloadAction<TradeHistory[]>) => {
      state.tradeHistory = action.payload;
    },
    
    // Set all symbol groups (complete data as shown in UI)
    setSymbolGroups: (state, action: PayloadAction<SymbolGroupData[]>) => {
      state.symbolGroups = action.payload;
    },
    
    // Set history days filter
    setHistoryDays: (state, action: PayloadAction<number>) => {
      state.historyDays = action.payload;
    },
    
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Set last fetch time
    setLastFetchTime: (state, action: PayloadAction<number>) => {
      state.lastFetchTime = action.payload;
    },
    
    // Clear all data
    clearTrades: (state) => {
      state.tradeHistory = [];
      state.symbolGroups = [];
      state.lastFetchTime = null;
      state.error = null;
    },
  },
});

export const {
  setTradeHistory,
  setSymbolGroups,
  setHistoryDays,
  setLoading,
  setError,
  setLastFetchTime,
  clearTrades,
} = tradeSlice.actions;

export default tradeSlice.reducer;
