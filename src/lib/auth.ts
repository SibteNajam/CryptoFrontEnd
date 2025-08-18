/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoginCredentials, SignupCredentials, AuthResponse } from '@/types/auth';
import TokenStorage from './tokenStorage';
const API_BASE_URL = 'https://localhost:3000';
export async function login(credentials: LoginCredentials): Promise<any> {
    const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
    });

    console.log('🔑 Login response status:', response.status);

    if (!response.ok) {
        const error = await response.json();
        console.error('🔑 Login error:', error);
        throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    console.log(' Raw login response:', data);

    // Transform the nested response structure
    if (data.status === 'Success' && data.data && data.data.data) {
        const { user, payload } = data.data.data;

        TokenStorage.setTokens(payload.accessToken, payload.refreshToken);
        // Map backend fields to frontend format
        const transformedResponse = {
            user: {
                id: user.id,
                email: user.email,
                displayName: user.name, // ← Map 'name' to 'displayName'
                createdAt: user.createdAt,
            },
            message: data.message,
            payload: payload, // Include tokens for storage
        };

        console.log(' Transformed login response:', transformedResponse);
        return transformedResponse;
    }

    console.error(' Unexpected response structure:', data);
    throw new Error('Unexpected response structure');
}

export async function signup(credentials: SignupCredentials): Promise<any> {
    const response = await fetch('http://localhost:3000/user/register-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for HttpOnly cookies
        body: JSON.stringify(credentials),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Signup failed');
    }

    const data = await response.json();
    console.log('✅ Parsed response data:', data);
    return data;
}

export async function logout(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Logout failed');
    }
}

export async function fetchCurrentUser(): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Failed to get current user');
    }

    return response.json();
}