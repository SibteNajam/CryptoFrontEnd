// services/exchanges/bitget/BitgetService.ts
import { ExchangeCredentials } from "@/infrastructure/features/exchange/exchangeSlice";
import { BaseExchangeService, NormalizedAccountInfo } from "../BaseExchangeService";

// Bitget raw response interface
interface BitgetAccountResponse {
  code: string;
  msg: string;
  requestTime: number;
  data: {
    userId: string;
    inviterId: string;
    ips: string;
    authorities: string[];
    parentId: number;
    traderType: string;
    channelCode: string;
    channel: string;
    regisTime: string;
  };
}

export class BitgetService extends BaseExchangeService {
  constructor() {
    super(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000');
  }

  getName(): string {
    return 'bitget';
  }

  setCredentials(credentials: ExchangeCredentials): void {
    if (!credentials.passphrase) {
      throw new Error('Passphrase is required for Bitget');
    }
    this.credentials = credentials;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.getAccountInfo();
      return true;
    } catch (error) {
      console.error('Bitget connection test failed:', error);
      return false;
    }
  }

  private async getRawAccountInfo(): Promise<BitgetAccountResponse> {
    if (!this.credentials) throw new Error('No credentials set for Bitget');
    
    const response = await fetch(`${this.apiUrl}/api/bitget/account-info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.credentials.apiKey,
        'X-SECRET-KEY': this.credentials.secretKey,
        'X-PASSPHRASE': this.credentials.passphrase!,
      }
    });

    if (!response.ok) {
      throw new Error(`Bitget API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }

  async getAccountInfo(): Promise<NormalizedAccountInfo> {
    const rawData = await this.getRawAccountInfo();
    
    // Normalize Bitget response to common format
    return {
      exchangeName: 'bitget',
      userId: rawData.data.userId,
      inviterId: rawData.data.inviterId,
      authorities: rawData.data.authorities,
      updateTime: rawData.requestTime,
      // Bitget doesn't have balances in this endpoint, you'd need another call
      balances: [], // You'd need to call a separate balances endpoint
      canTrade: rawData.data.authorities.includes('stow') || rawData.data.authorities.includes('stor'),
      canWithdraw: rawData.data.authorities.includes('wwow'),
    };
  }

  async connect(): Promise<void> {
    const isConnected = await this.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Bitget');
    }
  }

  disconnect(): void {
    this.credentials = null;
  }
}