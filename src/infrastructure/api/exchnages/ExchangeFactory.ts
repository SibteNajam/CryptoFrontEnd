// services/exchanges/ExchangeFactory.ts
import { ExchangeType, ExchangeCredentials } from '@/infrastructure/features/exchange/exchangeSlice';
import { BinanceService } from './binance/BinanceService';
import { BitgetService } from './bitget/BitgetService';
import { BaseExchangeService } from './BaseExchangeService';

export type ExchangeService = BaseExchangeService;

export function createExchangeService(
  exchangeType: ExchangeType,
  apiKey: string,
  secretKey: string,
  passphrase?: string
): ExchangeService {
  const credentials: ExchangeCredentials = {
    apiKey,
    secretKey,
    passphrase
  };

  let service: ExchangeService;

  switch (exchangeType) {
    case 'binance':
      service = new BinanceService();
      break;
    case 'bitget':
      service = new BitgetService();
      break;
    default:
      throw new Error(`Unsupported exchange: ${exchangeType}`);
  }

  service.setCredentials(credentials);
  return service;
}