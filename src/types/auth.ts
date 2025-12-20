export interface User {
    id: string;
    email: string;
    displayName: string;
    createdAt: string;
    configured_exchanges?: string[];
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
    status: string;
    message: string;
    statusCode: number;
    data: {
        data: {
            user: User;
            payload: {
                type: string;
                token: string;
                refresh_token?: string;
            };
        };
    };
}

export interface SignupResponse {
    status: string;
    data: {
        user: {
            id: string;
            email: string;
            displayName: string;
            createdAt: string;
        }
    };
    statusCode: number;
    message: string;
}