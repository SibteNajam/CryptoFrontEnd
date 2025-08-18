export interface User {
    id: string;
    email: string;
    displayName: string;
    createdAt: string;
}
export interface AuthState {
    user: User | null;
    isLoading: boolean;
    error: string | null;
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