export interface User {
    id: string;
    email: string;
    displayName: string;
    createdAt: string;
    configuredExchanges?: string[]; // Array of exchange names user has configured
}
export interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
}
export interface LoginCredentials {
    email: string;
    password: string;
}
export interface SignupCredentials {
    email: string;
    password: string;
    displayName: string;
    confirmPassword: string;
}
export interface AuthResponse {
    user: User;
    message: string;
}