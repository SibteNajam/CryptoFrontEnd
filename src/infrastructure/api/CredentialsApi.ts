import TokenStorage from '../login/tokenStorage';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// Types for credentials API
export interface CreateCredentialDto {
  exchange: 'binance' | 'bitget' | 'gateio' | 'mexc' | 'alpha_vantage';
  apiKey: string;
  secretKey: string;
  passphrase?: string;
  label?: string;
  activeTrading: boolean;
}

export interface CredentialResponseDto {
  id: string;
  exchange: string;
  isActive: boolean;
  label?: string;
  activeTrading?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiCredentialsResponse {
  status: string;
  statusCode: number;
  message: string;
  data: CredentialResponseDto;
}

/**
 * Save user credentials to the NestJS backend database
 * This is called when user first sets up credentials
 */
export async function saveCredentialsToDatabase(credentialData: CreateCredentialDto): Promise<ApiCredentialsResponse> {
  console.log('💾 saveCredentialsToDatabase called with:', credentialData);
  console.log('🌐 API Base URL:', API_BASE_URL);
  console.log('🔗 Full endpoint URL:', `${API_BASE_URL}/api-credentials/save-credentials`);

  try {
    // Get JWT token from TokenStorage
    const token = TokenStorage.getToken();

    if (!token) {
      console.error('❌ No access token found in TokenStorage. Available localStorage keys:', Object.keys(localStorage));
      throw new Error('No authentication token found. Please login first.');
    }

    console.log('🔐 Found access token (first 50 chars):', token.substring(0, 50) + '...');

    const requestBody = JSON.stringify(credentialData);
    console.log('📤 Request body:', requestBody);
    console.log('📤 Request body length:', requestBody.length);

    const fullUrl = `${API_BASE_URL}/api-credentials/save-credentials`;
    console.log('🌐 Making request to:', fullUrl);

    // First, test if backend is reachable
    console.log('🔍 Testing backend connectivity...');
    try {
      const testResponse = await fetch(`${API_BASE_URL}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      console.log('🔍 Backend test response:', testResponse.status);
    } catch (testError) {
      console.warn('🔍 Backend connectivity test failed:', testError);
    }

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: requestBody,
    });

    console.log('📡 Fetch response status:', response.status);
    console.log('📡 Fetch response statusText:', response.statusText);
    console.log('📡 Fetch response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.error('❌ Error response body:', errorData);
        errorMessage = `HTTP ${response.status}: ${errorData.message || response.statusText}`;
      } catch (parseError) {
        console.error('❌ Could not parse error response:', parseError);
        const textResponse = await response.text();
        console.error('❌ Raw error response:', textResponse);
      }
      throw new Error(errorMessage);
    }

    const data: ApiCredentialsResponse = await response.json();
    console.log('✅ Credentials saved successfully:', data);

    return data;
  } catch (error) {
    console.error('❌ Failed to save credentials:', error);
    throw error;
  }
}

export interface ApiCredentialsListResponse {
  status: string;
  statusCode: number;
  message: string;
  data: CredentialResponseDto[];
}

/**
 * Get all credentials for the authenticated user
 */
export async function getUserCredentials(): Promise<ApiCredentialsListResponse> {
  try {
    const token = TokenStorage.getToken();
    if (!token) throw new Error('No authentication token found');

    const response = await fetch(`${API_BASE_URL}/api-credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Failed to get credentials:', error);
    throw error;
  }
}
