const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export interface Balance {
  asset: string;
  free: string;
  locked: string;
}

export interface AccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: Balance[];
  permissions: string[];
}

export interface Order {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  stopPrice: string;
  icebergQty: string;
  time: number;
  updateTime: number;
  isWorking: boolean;
  workingTime: number;
  origQuoteOrderQty: string;
  selfTradePreventionMode: string;
}

// Account Info API
export async function getAccountInfo(): Promise<AccountInfo> {
  console.log('🏦 Fetching Account Info...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/binance/account-info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Account Info loaded successfully');
    return data;
  } catch (error) {
    console.error('❌ Account Info error:', error);
    throw error;
  }
}

// Open Orders API
export async function getOpenOrders(symbol?: string): Promise<Order[]> {
  console.log('📋 Fetching Open Orders...');
  
  try {
    const url = symbol 
      ? `${API_BASE_URL}/binance/open-orders?symbol=${symbol}` 
      : `${API_BASE_URL}/binance/open-orders`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Open Orders loaded successfully');
    return data;
  } catch (error) {
    console.error('❌ Open Orders error:', error);
    throw error;
  }
}

// Order History API
export async function getOrderHistory(): Promise<Array<{ symbol: string; orders: Order[] }>> {
  console.log('📜 Fetching Order History...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/binance/order-history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Order History loaded successfully');
    return data;
  } catch (error) {
    console.error('❌ Order History error:', error);
    throw error;
  }
}