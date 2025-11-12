// services/exchanges/BaseExchangeService.ts
import { ExchangeCredentials } from "@/infrastructure/features/exchange/exchangeSlice";

// Common normalized interface that both exchanges will return
export interface NormalizedAccountInfo {
  exchangeName: string;
  accountType?: string;
  canTrade?: boolean;
  canWithdraw?: boolean;
  canDeposit?: boolean;
  permissions?: string[];
  balances?: Array<{
    asset: string;
    free: string;
    locked: string;
    total: string;
  }>;
  updateTime?: number;
  commission?: {
    maker: number;
    taker: number;
  };
  // Bitget specific fields (optional)
  userId?: string;
  inviterId?: string;
  authorities?: string[];
  // Binance specific fields (optional)
  uid?: number;
}

export abstract class BaseExchangeService {
  protected apiUrl: string;
  protected credentials: ExchangeCredentials | null = null;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  abstract getName(): string;
  abstract setCredentials(credentials: ExchangeCredentials): void;
  abstract getAccountInfo(): Promise<NormalizedAccountInfo>;
  abstract testConnection(): Promise<boolean>;
  abstract connect(): Promise<void>;
  abstract disconnect(): void;
}
//  in my code i already implemented soem stuff that which exchagne is selected only that service will be active and data from that service will be populated into UI
 