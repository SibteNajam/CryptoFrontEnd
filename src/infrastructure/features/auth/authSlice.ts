// frontend/src/store/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, LoginCredentials, SignupCredentials, User } from '@/types/auth';
import { login, signup, logout, fetchCurrentUser } from '@/infrastructure/login/auth';
import TokenStorage from '@/infrastructure/login/tokenStorage';
import { setConfiguredExchanges } from '../exchange/exchangeSlice';

// Load initial state from localStorage
const loadInitialState = (): AuthState => {
    if (typeof window === 'undefined') {
        return {
            user: null,
            isLoading: false,
            error: null,
            isAuthenticated: false,
        };
    }

    try {
        const token = TokenStorage.getAccessToken();
        const savedState = localStorage.getItem('reduxState');

        if (token && savedState) {
            const parsedState = JSON.parse(savedState);
            if (parsedState.auth?.user) {
                console.log('🔄 Restoring auth state from localStorage');
                // Normalize the saved user to ensure displayName
                const savedUser = parsedState.auth.user;
                const normalizedUser = {
                    ...savedUser,
                    displayName: savedUser.name || savedUser.displayName
                };
                return {
                    user: normalizedUser,
                    isLoading: false,
                    error: null,
                    isAuthenticated: true,
                };
            }
        }
    } catch (error) {
        console.error('Error loading initial auth state:', error);
    }

    return {
        user: null,
        isLoading: false,
        error: null,
        isAuthenticated: false,
    };
};

const initialState: AuthState = loadInitialState();

// Async thunks
export const loginUser = createAsyncThunk(
    'auth/login',
    async (credentials: LoginCredentials, { dispatch, rejectWithValue }) => {
        try {
            const response = await login(credentials);
            console.log('✅ Login response in slice:', response);
            // Extract user from the correct response structure: response.data.data.user
            const user = response.data?.data?.user;
            if (!user) {
                console.error('❌ No user found in response:', response);
                return rejectWithValue('Login successful but user data not found');
            }

            console.log('👤 User logged in:', user.displayName || user.email);

            // Normalize user object to set displayName from backend's name
            const normalizedUser = {
                ...user,
                displayName: user.displayName
            };

            // Set configured exchanges in exchange slice (use the backend's configured_exchanges)
            dispatch(setConfiguredExchanges(user.configured_exchanges || []));

            return normalizedUser; // Return the normalized user object
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
        }
    }
);

export const signupUser = createAsyncThunk(
    'auth/signup',
    async (credentials: SignupCredentials, { rejectWithValue }) => {
        try {
            const response = await signup(credentials);///here we call the signup function from lib/auth.ts
            if (response.status === 'Success' && response.data && response.data.user) {
                return response.data.user; // Return the user object
            } else {
                console.error('❌ Unexpected signup response structure:', response);
                throw new Error('Invalid signup response');
            }
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Signup failed');
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logout',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            await logout(); // This clears tokens from TokenStorage
            // Clear Redux persisted state
            if (typeof window !== 'undefined') {
                localStorage.removeItem('reduxState');
            }
            // Clear configured exchanges
            dispatch(setConfiguredExchanges([]));
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Logout failed');
        }
    }
);

export const getCurrentUser = createAsyncThunk(
    'auth/getCurrentUser',
    async (_, { rejectWithValue }) => {
        try {
            const user = await fetchCurrentUser();
            // Normalize to ensure displayName
            const normalizedUser = {
                ...user,
                displayName: user.displayName
            };
            return normalizedUser; // Return the normalized user object
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Failed to get user');
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
        clearUser: (state) => {
            state.user = null;
            state.isAuthenticated = false;
        },
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
            state.isAuthenticated = true;
        },
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(loginUser.fulfilled, (state, action: PayloadAction<User>) => {
                state.isLoading = false;
                state.user = action.payload;
                state.isAuthenticated = true;
                state.error = null;
                // Note: Credentials will be loaded by the store middleware or component
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Signup
            .addCase(signupUser.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(signupUser.fulfilled, (state) => {
                state.isLoading = false;
                // Don't set user or isAuthenticated - user needs to login after signup
                state.user = null;
                state.isAuthenticated = false;
                state.error = null;
            })
            .addCase(signupUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Logout
            .addCase(logoutUser.fulfilled, (state) => {
                state.user = null;
                state.isLoading = false;
                state.error = null;
                state.isAuthenticated = false;
            })
            // Get current user
            .addCase(getCurrentUser.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getCurrentUser.fulfilled, (state, action: PayloadAction<User>) => {
                state.isLoading = false;
                state.user = action.payload;
                state.isAuthenticated = true;
                state.error = null;
            })
            .addCase(getCurrentUser.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.isAuthenticated = false;
            });
    },
});

export const { clearError, clearUser, setUser } = authSlice.actions;
export default authSlice.reducer;