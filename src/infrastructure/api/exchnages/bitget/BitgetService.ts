import { ExchangeCredentials } from '@/infrastructure/features/exchange/exchangeSlice';
import { BaseExchangeService, NormalizedAccountInfo } from '../BaseExchangeService';

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
    super(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://146.59.93.94:3000');
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
    if (!this.credentials) {
      throw new Error('No credentials set for Bitget');
    }

    const response = await fetch(`${this.apiUrl}/api/bitget/account-info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.credentials.apiKey,
        'X-SECRET-KEY': this.credentials.secretKey,
        'X-PASSPHRASE': this.credentials.passphrase!
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Bitget API error: ${response.status} ${response.statusText}: ${body}`);
    }

    return (await response.json()) as BitgetAccountResponse;
  }

  async getAccountInfo(): Promise<NormalizedAccountInfo> {
    const rawData = await this.getRawAccountInfo();

    return {
      exchangeName: 'bitget',
      userId: rawData.data.userId,
      inviterId: rawData.data.inviterId,
      authorities: rawData.data.authorities,
      updateTime: rawData.requestTime,
      balances: [],
      canTrade: rawData.data.authorities.some(auth => auth === 'stow' || auth === 'stor'),
      canWithdraw: rawData.data.authorities.includes('wwow')
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
