/**
 * Authentication API Client
 * Handles login, signup, logout, and user session management
 */

import TokenStorage from '../../lib/tokenStorage';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

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

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  configuredExchanges?: string[];
  configured_exchanges?: string[];
}

export interface AuthResponsePayload {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface AuthResponse {
  status: string;
  message?: string;
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

/**
 * Login user
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || 'Login failed');
  }

  const data: AuthResponse = await response.json();

  console.log('🔍 Login response structure:', JSON.stringify(data, null, 2));

  // Store token from response
  // Backend returns: {"status":"Success","data":{"data":{"user":{...},"payload":{"token":"..."}}}}
  const token = (data as any).data?.data?.payload?.token;

  if (token) {
    console.log('✅ Token found in data.data.payload.token');
    TokenStorage.setToken(token);
  } else {
    console.error('❌ No token found in response!', data);
  }

  return data;
}

/**
 * Sign up new user
 */
export async function signup(credentials: SignupCredentials): Promise<SignupResponse> {
  const response = await fetch(`${API_BASE_URL}/user/register-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Signup failed' }));
    throw new Error(error.message || 'Signup failed');
  }

  const data: SignupResponse = await response.json();
  return data;
}

/**
 * Logout user
 */
export async function logout(): Promise<void> {
  const token = TokenStorage.getToken();

  if (token) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout request failed:', error);
      // Continue with local logout even if server request fails
    }
  }

  // Clear local storage
  TokenStorage.clearAll();
}

/**
 * Fetch current authenticated user
 */
export async function fetchCurrentUser(): Promise<User> {
  const token = TokenStorage.getToken();

  if (!token) {
    throw new Error('No authentication token found');
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired or invalid
      TokenStorage.clearAll();
      throw new Error('Session expired. Please login again.');
    }

    const error = await response.json().catch(() => ({ message: 'Failed to fetch user' }));
    throw new Error(error.message || 'Failed to fetch user');
  }

  const user: User = await response.json();
  return user;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return TokenStorage.isAuthenticated();
}

/**
 * Get authentication headers for API requests
 */
export function getAuthHeaders(): HeadersInit {
  const token = TokenStorage.getToken();

  if (!token) {
    return {
      'Content-Type': 'application/json',
    };
  }

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export interface SignupResponse { status: string; data: { user: { id: string; email: string; displayName: string; createdAt: string; } }; statusCode: number; message: string; }