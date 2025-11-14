// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import exchangeSlice from '../features/exchange/exchangeSlice';
import authReducer from '../features/auth/authSlice';
import tradeReducer from '../features/trades/tradeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    exchange: exchangeSlice,
    trades: tradeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Subscribe to store changes and save to localStorage
if (typeof window !== 'undefined') {
  const TokenStorage = require('@/lib/tokenStorage').default;
  
  // Initial load is now handled in the slices themselves
  console.log('� Redux store initialized with persisted state');

  // Subscribe to store changes and save to localStorage
  store.subscribe(() => {
    try {
      const state = store.getState();
      const token = TokenStorage.getAccessToken();
      
      // Only save if user is authenticated
      if (state.auth.isAuthenticated && token) {
        const stateToSave = {
          auth: {
            user: state.auth.user,
            isAuthenticated: state.auth.isAuthenticated,
          },
          exchange: {
            selectedExchange: state.exchange.selectedExchange,
            credentialsArray: state.exchange.credentialsArray,
          },
        };
        localStorage.setItem('reduxState', JSON.stringify(stateToSave));
        console.log('💾 State persisted to localStorage');
      } else if (!token) {
        // Clear saved state if no token
        localStorage.removeItem('reduxState');
        console.log('🗑️ Cleared localStorage (no token)');
      }
    } catch (err) {
      console.error('❌ Error saving state to localStorage:', err);
    }
  });
}