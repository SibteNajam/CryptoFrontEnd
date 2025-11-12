// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import exchangeSlice from '../features/exchange/exchangeSlice';
import authReducer from '../features/auth/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    exchange: exchangeSlice,
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

// Load persisted state from localStorage on initialization
if (typeof window !== 'undefined') {
  try {
    const savedState = localStorage.getItem('reduxState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      console.log('📦 Loading persisted state:', parsedState);
      
      // Check if there's a valid token in TokenStorage
      const TokenStorage = require('@/lib/tokenStorage').default;
      const token = TokenStorage.getAccessToken();
      
      // Restore auth state
      if (parsedState.auth?.user && token) {
        console.log('👤 Restoring auth state with user:', parsedState.auth.user);
        const { setUser } = require('./features/auth/authSlice');
        store.dispatch(setUser(parsedState.auth.user));
      } else {
        console.log('⚠️ No valid auth state to restore (token:', !!token, ', user:', !!parsedState.auth?.user, ')');
      }
      
      // Restore exchange credentials
      if (parsedState.exchange?.credentialsArray) {
        console.log('🔑 Restoring exchange credentials');
        const { setCredentials, setSelectedExchange } = require('../features/exchange/exchangeSlice');
        
        // Restore all credentials
        parsedState.exchange.credentialsArray.forEach((creds: any) => {
          store.dispatch(setCredentials(creds));
        });
        
        // Restore selected exchange
        if (parsedState.exchange.selectedExchange) {
          store.dispatch(setSelectedExchange(parsedState.exchange.selectedExchange));
        }
      } else if (parsedState.exchange?.credentials) {
        // Handle legacy single credential format
        console.log('🔑 Migrating legacy credentials format');
        const { setCredentials, setSelectedExchange } = require('../features/exchange/exchangeSlice');
        store.dispatch(setCredentials(parsedState.exchange.credentials));
        if (parsedState.exchange.selectedExchange) {
          store.dispatch(setSelectedExchange(parsedState.exchange.selectedExchange));
        }
      }
    }
  } catch (err) {
    console.error('❌ Error loading persisted state:', err);
  }

  // Subscribe to store changes and save to localStorage
  store.subscribe(() => {
    try {
      const state = store.getState();
      // Only save if user is authenticated
      const TokenStorage = require('@/lib/tokenStorage').default;
      const token = TokenStorage.getAccessToken();
      
      if (state.auth.isAuthenticated && token) {
        localStorage.setItem('reduxState', JSON.stringify(state));
        console.log('💾 State saved to localStorage');
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