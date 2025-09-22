const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';



// ------- performace snapshot api types
// infrastructure/api/PortfolioApi.ts
export interface AccountSnapshotResponse {
  totalSnapshots: number;
  period: string;
  snapshots: Snapshot[];
  currentValue: number;
  initialValue: number;
  meaningfulInitialValue: number;
  performance: {
    totalReturn: string;
    rawTotalReturn: string;
    days: number;
    avgDailyReturn: string;
  };
  summary: {
    totalPortfolioValue: string;
    topAssets: TopAsset[];
    assetPricesUsed?: { [key: string]: number }; // Optional for debugging
  };
}

export interface Snapshot {
  date: string;
  totalValueUSD: number;
  totalAssetOfBtc: number;
  balances: Balance[];
  updateTime: number;
  change24h: number;
  pricesUsed?: { [key: string]: number };
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
  usdValue: number;        // Added
  pricePerUnit: number;    // Added
}

export interface TopAsset {
  asset: string;
  value: string;
  percentage: string;
}
// ----------
// export interface Balance {
//   asset: string;
//   free: string;
//   locked: string;
// }

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

export interface UserAsset {
  asset: string;
  free: string;
  locked: string;
  freeze: string;
  withdrawing: string;
  ipoable: string;
  btcValuation: string;
}

export interface Deposit {
  id: string;
  amount: string;
  coin: string;
  network: string;
  status: number;
  address: string;
  addressTag: string;
  txId: string;
  insertTime: number;
  transferType: number;
  confirmTimes: string;
}

export interface Withdrawal {
  id: string;
  amount: string;
  transactionFee: string;
  coin: string;
  status: number;
  address: string;
  txId: string;
  applyTime: string;
  network: string;
  transferType: number;
}

export interface AssetDetail {
  [key: string]: {
    minWithdrawAmount: string;
    depositStatus: boolean;
    withdrawFee: number;
    withdrawStatus: boolean;
    depositTip?: string;
  };
}

export interface TradeFee {
  symbol: string;
  makerCommission: string;
  takerCommission: string;
}

export interface TransferRow {
  timestamp: number; // Unix timestamp in milliseconds
  asset: string;     // e.g., "USDT"
  amount: string;    // e.g., "14", "19.56081014"
  type: string;      // e.g., "UMFUTURE_MAIN", "MAIN_UMFUTURE"
  status: string;    // e.g., "CONFIRMED"
  tranId: number;    // e.g., 298218441009
}

export interface TransferHistoryResponse {
  total: number;
  rows: TransferRow[];
  current: number;
  size: number;
  pages: number;
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

// Open Orders API--working-binance-mainnet
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
export async function getOrderHistory(): Promise<Array<{ symbol: string; orders: any[] }>> {
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

export async function getUserAssets(): Promise<UserAsset[]> {
  console.log('💰 Fetching Enhanced User Assets...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/binance/user-assets`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Enhanced User Assets loaded successfully');
    return data;
  } catch (error) {
    console.error('❌ Enhanced User Assets error:', error);
    throw error;
  }
}
// Transfer History API
export async function getTransferHistory(
  current: number = 1, 
  size: number = 100
): Promise<TransferHistoryResponse> {
  console.log('🔄 Fetching Internal Transfer History...', { current, size });

  try {
    const response = await fetch(
      `${API_BASE_URL}/binance/transfer-history?current=${current}&size=${size}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: TransferHistoryResponse = await response.json();
    console.log('✅ Internal Transfer History loaded successfully', {
      total: data.total,
      pages: data.pages
    });
    return data;
  } catch (error) {
    console.error('❌ Internal Transfer History error:', error);
    throw error;
  }
}


export async function getDepositHistory(coin?: string, status?: number, limit = 1000): Promise<Deposit[]> {
  console.log('📥 Fetching Deposit History...');
  
  try {
    let url = `${API_BASE_URL}/binance/deposit-history?limit=${limit}`;
    if (coin) url += `&coin=${coin}`;
    if (status !== undefined) url += `&status=${status}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Deposit History loaded successfully');
    return data;
  } catch (error) {
    console.error('❌ Deposit History error:', error);
    throw error;
  }
}

export async function getWithdrawHistory(coin?: string, status?: number, limit = 1000): Promise<Withdrawal[]> {
  console.log('📤 Fetching Withdrawal History...');
  
  try {
    let url = `${API_BASE_URL}/binance/withdraw-history?limit=${limit}`;
    if (coin) url += `&coin=${coin}`;
    if (status !== undefined) url += `&status=${status}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Withdrawal History loaded successfully');
    return data;
  } catch (error) {
    console.error('❌ Withdrawal History error:', error);
    throw error;
  }
}
// infrastructure/api/PortfolioApi.ts
export async function getAccountSnapshot(): Promise<AccountSnapshotResponse> {
  console.log('🔄 Fetching Account Snapshot...');

  try {
    // Fixed: Use correct endpoint
    const response = await fetch(`${API_BASE_URL}/binance/account-snapshot`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
    }

    const data: AccountSnapshotResponse = await response.json();
    console.log('✅ Account Snapshot loaded successfully', {
      totalSnapshots: data.totalSnapshots,
      currentValue: data.currentValue,
      totalReturn: data.performance.totalReturn
    });
    return data;
  } catch (error) {
    console.error('❌ Account Snapshot error:', error);
    throw error;
  }
}
export async function getAssetDetail(asset?: string): Promise<AssetDetail> {
  console.log('ℹ️ Fetching Asset Details...');
  
  try {
    let url = `${API_BASE_URL}/binance/asset-detail`;
    if (asset) url += `?asset=${asset}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Asset Details loaded successfully');
    return data;
  } catch (error) {
    console.error('❌ Asset Details error:', error);
    throw error;
  }
}

export async function getTradeFee(symbol?: string): Promise<TradeFee[]> {
  console.log('💸 Fetching Trade Fees...');
  
  try {
    let url = `${API_BASE_URL}/binance/trade-fee`;
    if (symbol) url += `?symbol=${symbol}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Trade Fees loaded successfully');
    return data;
  } catch (error) {
    console.error('❌ Trade Fees error:', error);
    throw error;
  }



  // snapshot api for performace
}