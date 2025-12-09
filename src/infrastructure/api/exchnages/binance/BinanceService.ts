// // services/exchanges/binance/BinanceService.ts
// import { ExchangeCredentials } from '@/infrastructure/features/exchange/exchangeSlice';
// import { BaseExchangeService, NormalizedAccountInfo } from '../BaseExchangeService';

// // Binance raw response interface
// interface BinanceAccountResponse {
//   makerCommission: number;
//   takerCommission: number;
//   buyerCommission: number;
//   sellerCommission: number;
//   canTrade: boolean;
//   canWithdraw: boolean;
//   canDeposit: boolean;
//   updateTime: number;
//   accountType: string;
//   balances: Array<{
//     asset: string;
//     free: string;
//     locked: string;
//   }>;
//   permissions: string[];
//   uid: number;
// }

// export class BinanceService extends BaseExchangeService {
//   constructor() {
//     super(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://146.59.93.94:3000');
//   }

//   getName(): string {
//     return 'binance';
//   }

//   setCredentials(credentials: ExchangeCredentials): void {
//     this.credentials = credentials;
//   }

//   async testConnection(): Promise<boolean> {
//     try {
//       await this.getAccountInfo();
//       return true;
//     } catch (error) {
//       console.error('Binance connection test failed:', error);
//       return false;
//     }
//   }

//   private async getRawAccountInfo(): Promise<BinanceAccountResponse> {
//     if (!this.credentials) throw new Error('No credentials set for Binance');
    
//     const response = await fetch(`${this.apiUrl}/api/binance/account-info`, {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//         'X-API-KEY': this.credentials.apiKey,
//         'X-SECRET-KEY': this.credentials.secretKey,
//       }
//     });

//     if (!response.ok) {
//       throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
//     }
    
//     return await response.json();
//   }

//   async getAccountInfo(): Promise<NormalizedAccountInfo> {
//     const rawData = await this.getRawAccountInfo();
    
//     // Normalize Binance response to common format
//     return {
//       exchangeName: 'binance',
//       accountType: rawData.accountType,
//       canTrade: rawData.canTrade,
//       canWithdraw: rawData.canWithdraw,
//       canDeposit: rawData.canDeposit,
//       permissions: rawData.permissions,
//       balances: rawData.balances.map(balance => ({
//         asset: balance.asset,
//         free: balance.free,
//         locked: balance.locked,
//         total: (parseFloat(balance.free) + parseFloat(balance.locked)).toString()
//       })),
//       updateTime: rawData.updateTime,
//       commission: {
//         maker: rawData.makerCommission / 10000, // Binance returns basis points
//         taker: rawData.takerCommission / 10000
//       },
//       uid: rawData.uid
//     };
//   }

//   async connect(): Promise<void> {
//     const isConnected = await this.testConnection();
//     if (!isConnected) {
//       throw new Error('Failed to connect to Binance');
//     }
//   }

//   disconnect(): void {
//     this.credentials = null;
//   }
// }