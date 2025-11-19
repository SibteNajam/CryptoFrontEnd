// frontend/src/store/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, LoginCredentials, SignupCredentials, User } from '@/types/auth';
import { login, signup, logout, fetchCurrentUser } from '@/lib/auth';
import TokenStorage from '@/lib/tokenStorage';

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
                return {
                    user: parsedState.auth.user,
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
    async (credentials: LoginCredentials, { rejectWithValue }) => {
        try {
            const response = await login(credentials);
            console.log('✅ Login response in slice:', response);

            // Tokens are already stored in TokenStorage by the login function
            if (response.payload && response.payload.accessToken) {
                console.log('🔑 Token stored successfully');
            }

            return response.user; // Return the user object for state
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
            console.log('Signup response in slice:', response);
            if (response.status === 'Success' && response.data && response.data.user) {
                return response.data.user; // Return the user object
            } else {
                // If response structure is different, adapt accordingly
                return response.user || response;
            }
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Signup failed');
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            await logout(); // This clears tokens from TokenStorage
            // Clear Redux persisted state
            if (typeof window !== 'undefined') {
                localStorage.removeItem('reduxState');
            }
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'Logout failed');
        }
    }
);

export const getCurrentUser = createAsyncThunk(
    'auth/getCurrentUser',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetchCurrentUser();
            return response.user;
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
            .addCase(signupUser.fulfilled, (state, action: PayloadAction<User>) => {
                state.isLoading = false;
                state.user = action.payload;
                state.isAuthenticated = true;
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