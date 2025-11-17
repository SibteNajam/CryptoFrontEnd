// TradingBotApi.ts - FastAPI Trading Bot Integration
const API_BASE = process.env.NEXT_PUBLIC_TRADING_BOT_API || 'http://localhost:8000';

export interface TradingConfig {
  amount_percentage: number;
  tp_level_count: number;
  tp1_percentage: number;
  tp2_percentage: number;
  tp3_percentage: number;
  stop_loss_percentage: number;
}

export interface TradingStats {
  start_balance: number;
  current_balance: number;
  profit: number;
  queue_size: number;
  processing_symbol: string | null;
  stats: {
    logic_checks: number;
    symbols_queued: number;
    symbols_processed: number;
    pipeline_successes: number;
    pipeline_failures: number;
    symbols_skipped_duplicates: number;
    buy_signals_found: number;
    sell_signals_discarded: number;
    vlm_bypass_count: number;
    symbols_cleared_from_queue: number;
  };
}

export interface ExchangeInitRequest {
  api_key: string;
  passphrase?: string;
  secret: string;
  exchange: 'bitget' | 'binance';
}

export interface ExchangeInitResponse {
  success: boolean;
  message: string;
  active_exchange: string;
  credentials_configured: boolean;
  start_balance: number;
}

export interface ActiveExchangeResponse {
  exchange: string;
  credentials_set: boolean;
  is_configured: boolean;
  start_balance: number;
  supported_exchanges: string[];
}

export interface ProcessingStatusResponse {
  processing_symbol: string | null;
  processing_status: 'idle' | 'vlm_processing' | 'order_placing' | 'completed' | 'vlm_failed';
  queue_size: number;
}

class TradingBotApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE;
  }

  // Exchange Management
  async initializeExchange(data: ExchangeInitRequest): Promise<ExchangeInitResponse> {
    const response = await fetch(`${this.baseUrl}/api/initialize-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to initialize exchange');
    }
    
    return response.json();
  }

  async getActiveExchange(): Promise<ActiveExchangeResponse> {
    const response = await fetch(`${this.baseUrl}/api/active-exchange`);
    
    if (!response.ok) {
      throw new Error('Failed to get active exchange');
    }
    
    return response.json();
  }

  async updateCredentials(credentials: { api_key: string; secret: string; passphrase?: string }) {
    const response = await fetch(`${this.baseUrl}/api/update-credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update credentials');
    }
    
    return response.json();
  }

  async switchExchange(data: ExchangeInitRequest): Promise<ExchangeInitResponse> {
    const response = await fetch(`${this.baseUrl}/api/switch-exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to switch exchange');
    }
    
    return response.json();
  }

  async resetStartBalance() {
    const response = await fetch(`${this.baseUrl}/api/reset-start-balance`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error('Failed to reset start balance');
    }
    
    return response.json();
  }

  // Trading Configuration
  async getTradingConfig(): Promise<TradingConfig> {
    const response = await fetch(`${this.baseUrl}/api/config`);
    
    if (!response.ok) {
      throw new Error('Failed to get trading config');
    }
    
    return response.json();
  }

  async updateTradingConfig(config: TradingConfig): Promise<{ status: string; config: TradingConfig }> {
    const response = await fetch(`${this.baseUrl}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update trading config');
    }
    
    return response.json();
  }

  // Statistics & Monitoring
  async getStats(): Promise<TradingStats> {
    const response = await fetch(`${this.baseUrl}/api/stats`);
    
    if (!response.ok) {
      throw new Error('Failed to get stats');
    }
    
    return response.json();
  }

  async getProcessingStatus(): Promise<ProcessingStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/processing-status`);
    
    if (!response.ok) {
      throw new Error('Failed to get processing status');
    }
    
    return response.json();
  }

  async getPlacedOrders(): Promise<{ placed: string[] }> {
    const response = await fetch(`${this.baseUrl}/api/placed-success`);
    
    if (!response.ok) {
      throw new Error('Failed to get placed orders');
    }
    
    return response.json();
  }

  async getBalanceHistory(): Promise<{ history: any[]; start_balance: number }> {
    const response = await fetch(`${this.baseUrl}/api/balance-history`);
    
    if (!response.ok) {
      throw new Error('Failed to get balance history');
    }
    
    return response.json();
  }
}

export default new TradingBotApi();
