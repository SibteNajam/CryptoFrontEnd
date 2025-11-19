/* eslint-disable @typescript-eslint/no-explicit-any */
import { LoginCredentials, SignupCredentials, AuthResponse } from '@/types/auth';
import TokenStorage from './tokenStorage';
const API_BASE_URL = 'http://localhost:3000';
export async function login(credentials: LoginCredentials): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
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

        console.log('🔑 Login response - configured exchanges:', user.configured_exchanges);
        
        TokenStorage.setTokens(payload.token, payload.refresh_token);
        // Map backend fields to frontend format
        const transformedResponse = {
            user: {
                id: user.id,
                email: user.email,
                displayName: user.name, // ← Map 'name' to 'displayName'
                createdAt: user.createdAt,
                configuredExchanges: user.configured_exchanges || [], // ← Add configured exchanges
            },
            message: data.message,
                      payload: {
                accessToken: payload.token, // For frontend consistency
                refreshToken: payload.refresh_token,
            },// Include tokens for storage
        };

        console.log('✅ Final transformed user configuredExchanges:', transformedResponse.user.configuredExchanges);
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
//     const response = await fetch(`${API_BASE_URL}/auth/logout`, {
//         method: 'POST',
//         credentials: 'include',
//     });

//     if (!response.ok) {
//         throw new Error('Logout failed');
//     }

    TokenStorage.clearTokens();
}


export async function fetchCurrentUser(): Promise<AuthResponse> {
    const token = TokenStorage.getAccessToken();
    
    console.log('🔐 JWT Token Debug:');
    console.log('🔐 Token exists:', !!token);
    console.log('🔐 Token length:', token?.length);
    
    // Decode and show JWT payload
    if (token) {
        try {
            const payload = token.split('.')[1];
            const decodedPayload = JSON.parse(atob(payload));
            console.log('🔐 Decoded JWT payload:', decodedPayload);
            console.log('🔐 User ID (sub):', decodedPayload.sub);
            console.log('🔐 Token expires:', new Date(decodedPayload.exp * 1000));
        } catch (e) {
            console.log('🔐 Error decoding JWT:', e);
        }
    }
    
    console.log('📡 Authorization header will be:', `Bearer ${token?.substring(0, 50)}...`);
    
    const response = await fetch(`${API_BASE_URL}/user/me`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });

    if (!response.ok) {
        if (response.status === 401) {
            TokenStorage.clearTokens();
            throw new Error('Session expired. Please login again.');
        }
        throw new Error('Failed to get current user');
    }

    const data = await response.json();
    
    // Transform backend response to match frontend format
    if (data.status === 'Success' && data.data) {
        const userData = data.data;
        return {
            user: {
                id: userData.id,
                email: userData.email,
                displayName: userData.name || userData.displayName,
                createdAt: userData.createdAt,
            },
            message: data.message || 'User fetched successfully',
        };
    }
    
    // If response structure is different, try to adapt
    return data;
}