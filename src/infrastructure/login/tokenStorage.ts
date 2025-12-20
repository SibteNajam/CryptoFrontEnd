/**
 * Token Storage Utility
 * Manages authentication tokens and API credentials in browser localStorage
 */

interface TokenData {
  exchangeId?: string;
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
  token?: string;
  expiresAt?: number;
}

class TokenStorage {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly CREDENTIALS_KEY = 'exchange_credentials';

  /**
   * Store authentication token
   */
  static setToken(token: string, expiresIn?: number): void {
    if (typeof window === 'undefined') return;
    
    const data: TokenData = {
      token,
      expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
    };
    
    localStorage.setItem(this.TOKEN_KEY, JSON.stringify(data));
  }

  /**
   * Get authentication token
   */
  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const data = localStorage.getItem(this.TOKEN_KEY);
      if (!data) return null;

      const parsed: TokenData = JSON.parse(data);
      
      // Check if token expired
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        this.clearToken();
        return null;
      }

      return parsed.token || null;
    } catch (error) {
      console.error('Error reading token:', error);
      return null;
    }
  }

  /**
   * Get access token (alias for getToken for backward compatibility)
   */
  static getAccessToken(): string | null {
    return this.getToken();
  }

  /**
   * Clear authentication token
   */
  static clearToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Store exchange credentials
   */
  static setCredentials(exchangeId: string, apiKey: string, apiSecret: string, passphrase?: string): void {
    if (typeof window === 'undefined') return;
    
    const data: TokenData = {
      exchangeId,
      apiKey,
      apiSecret,
      passphrase,
    };
    
    localStorage.setItem(this.CREDENTIALS_KEY, JSON.stringify(data));
  }

  /**
   * Get exchange credentials
   */
  static getCredentials(): TokenData | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const data = localStorage.getItem(this.CREDENTIALS_KEY);
      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading credentials:', error);
      return null;
    }
  }

  /**
   * Clear exchange credentials
   */
  static clearCredentials(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.CREDENTIALS_KEY);
  }

  /**
   * Clear all stored data
   */
  static clearAll(): void {
    this.clearToken();
    this.clearCredentials();
  }

  /**
   * Clear tokens (alias for clearAll for backward compatibility)
   */
  static clearTokens(): void {
    this.clearAll();
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export default TokenStorage;
