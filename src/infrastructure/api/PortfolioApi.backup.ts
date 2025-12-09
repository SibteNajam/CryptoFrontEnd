const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://146.59.93.94:3000';

// Credentials interface for API calls
export interface ApiCredentials {
  apiKey: string;
  secretKey: string;
  passphrase?: string;
}



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

// Bitget Response Types
export interface BitgetAsset {
  coin: string;
  available: string;
  limitAvailable: string;
  frozen: string;
  locked: string;
  uTime: string;
}

export interface BitgetTicker {
  open: string;
  symbol: string;
  high24h: string;
  low24h: string;
  lastPr: string;
  quoteVolume: string;
  baseVolume: string;
  usdtVolume: string;
  ts: string;
  bidPr: string;
  askPr: string;
  bidSz: string;
  askSz: string;
  openUtc: string;
  changeUtc24h: string;
  change24h: string;
}

// Bitget Open Orders Response Types
export interface BitgetOrder {
  userId: string;
  symbol: string;
  orderId: string;
  clientOid: string;
  priceAvg: string;
  size: string;
  orderType: string;
  side: string;
  status: string;
  basePrice: string;
  baseVolume: string;
  quoteVolume: string;
  enterPointSource: string;
  orderSource: string;
  triggerPrice: string | null;
  tpslType: string;
  presetTakeProfitPrice: string;
  executeTakeProfitPrice: string;
  presetStopLossPrice: string;
  executeStopLossPrice: string;
  force: string;
  cTime: string;
  uTime: string;
}

export interface BitgetOpenOrdersResponse {
  totalOrders: number;
  orders: BitgetOrder[];
  breakdown: {
    normalOrders: number;
    tpslOrders: number;
    planOrders: number;
  };
}

// Normalized types for multi-exchange support
export interface NormalizedAccountInfo {
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
  exchange: 'binance' | 'bitget';
}

export interface NormalizedUserAsset {
  asset: string;
  free: string;
  locked: string;
  freeze: string;
  withdrawing: string;
  ipoable: string;
  btcValuation: string;
  exchange: 'binance' | 'bitget';
  // Additional fields for proper USD valuation
  usdValue?: number;
  pricePerUnit?: number;
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
export async function getAccountInfo(credentials?: ApiCredentials): Promise<AccountInfo> {
  console.log('🏦 Fetching Account Info...');
  
  try {
    console.log('🔐 Binance Credentials:', credentials ? {
      hasApiKey: !!credentials.apiKey,
      hasSecretKey: !!credentials.secretKey,
      apiKeyPreview: credentials.apiKey?.substring(0, 8) + '...'
    } : 'NO CREDENTIALS PROVIDED');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add credentials to headers if available
    if (credentials) {
      headers['x-api-key'] = credentials.apiKey;
      headers['x-secret-key'] = credentials.secretKey;
      if (credentials.passphrase) {
        headers['x-passphrase'] = credentials.passphrase;
      }
    }
    
    console.log('📤 Request Headers:', Object.keys(headers));
    
    const response = await fetch(`${API_BASE_URL}/binance/account-info`, {
      method: 'GET',
      headers,
      cache: 'no-store',
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
export async function getOpenOrders(symbol?: string, credentials?: ApiCredentials): Promise<Order[]> {
  console.log('📋 Fetching Binance Open Orders...');
  
  try {
    const url = symbol 
      ? `${API_BASE_URL}/binance/open-orders?symbol=${symbol}` 
      : `${API_BASE_URL}/binance/open-orders`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add credentials to headers if available
    if (credentials) {
      headers['x-api-key'] = credentials.apiKey;
      headers['x-secret-key'] = credentials.secretKey;
      if (credentials.passphrase) {
        headers['x-passphrase'] = credentials.passphrase;
      }
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('✅ Binance Open Orders loaded successfully');
    return data;
  } catch (error) {
    console.error('❌ Binance Open Orders error:', error);
    throw error;
  }
}

// Bitget Open Orders API
export async function getBitgetOpenOrders(symbol?: string, credentials?: ApiCredentials): Promise<BitgetOpenOrdersResponse> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔵 BITGET API CALL: getBitgetOpenOrders');
  console.log('   URL:', `${API_BASE_URL}/bitget/order/all-open-orders`);
  console.log('   Symbol:', symbol || 'All symbols');
  
  console.log('🔐 Bitget Credentials:', credentials ? {
    hasApiKey: !!credentials.apiKey,
    hasSecretKey: !!credentials.secretKey,
    hasPassphrase: !!credentials.passphrase,
    apiKeyPreview: credentials.apiKey?.substring(0, 8) + '...'
  } : 'NO CREDENTIALS PROVIDED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': '*/*',
    };
    
    // Add credentials to headers if available
    if (credentials) {
      headers['x-api-key'] = credentials.apiKey;
      headers['x-secret-key'] = credentials.secretKey;
      if (credentials.passphrase) {
        headers['x-passphrase'] = credentials.passphrase;
      }
    }
    
    console.log('📤 Request Headers:', Object.keys(headers));
    
    const url = symbol 
      ? `${API_BASE_URL}/bitget/order/all-open-orders?symbol=${symbol}` 
      : `${API_BASE_URL}/bitget/order/all-open-orders`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('❌ Bitget Open Orders API Error:', response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: BitgetOpenOrdersResponse = await response.json();
    console.log('✅ BITGET OPEN ORDERS RESPONSE:', JSON.stringify(data, null, 2));
    console.log('   Total Orders:', data.totalOrders);
    console.log('   Normal Orders:', data.breakdown.normalOrders);
    console.log('   TPSL Orders:', data.breakdown.tpslOrders);
    console.log('   Plan Orders:', data.breakdown.planOrders);
    return data;
  } catch (error) {
    console.error('❌ Bitget Open Orders error:', error);
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

export async function getUserAssets(credentials?: ApiCredentials): Promise<UserAsset[]> {
  console.log('💰 Fetching Enhanced User Assets...');
  
  try {
    console.log('🔐 Binance Credentials:', credentials ? {
      hasApiKey: !!credentials.apiKey,
      hasSecretKey: !!credentials.secretKey,
      apiKeyPreview: credentials.apiKey?.substring(0, 8) + '...'
    } : 'NO CREDENTIALS PROVIDED');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    // Add credentials to headers if available
    if (credentials) {
      headers['x-api-key'] = credentials.apiKey;
      headers['x-secret-key'] = credentials.secretKey;
      if (credentials.passphrase) {
        headers['x-passphrase'] = credentials.passphrase;
      }
      console.log('🔐 Credentials added to headers:', {
        'x-api-key': credentials.apiKey.substring(0, 10) + '...',
        'x-secret-key': credentials.secretKey.substring(0, 10) + '...',
        'x-passphrase': credentials.passphrase ? '***' : 'N/A'
      });
    }
    
    console.log('📤 Request Headers:', Object.keys(headers));
    
    const response = await fetch(`${API_BASE_URL}/binance/user-assets`, {
      method: 'GET',
      headers,
      cache: 'no-store', // Disable caching for authenticated requests
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
export async function getAccountSnapshot(credentials?: ApiCredentials): Promise<AccountSnapshotResponse> {
  console.log('🔄 Fetching Account Snapshot...');

  try {
    console.log('🔐 Binance Credentials:', credentials ? {
      hasApiKey: !!credentials.apiKey,
      hasSecretKey: !!credentials.secretKey,
      apiKeyPreview: credentials.apiKey?.substring(0, 8) + '...'
    } : 'NO CREDENTIALS PROVIDED');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Add credentials to headers if available
    if (credentials) {
      headers['x-api-key'] = credentials.apiKey;
      headers['x-secret-key'] = credentials.secretKey;
      if (credentials.passphrase) {
        headers['x-passphrase'] = credentials.passphrase;
      }
    }
    
    console.log('📤 Request Headers:', Object.keys(headers));
    
    const response = await fetch(`${API_BASE_URL}/binance/account-snapshot`, {
      method: 'GET',
      headers,
      cache: 'no-store',
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

// ============================================
// BITGET API FUNCTIONS
// ============================================

// Bitget: Get Ticker Price for a symbol
export async function getBitgetTicker(symbol: string): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/bitget/tickers?symbol=${symbol}`, {
      method: 'GET',
      headers: { 'accept': '*/*' },
    });

    if (!response.ok) {
      console.warn(`⚠️ Bitget ticker failed for ${symbol}: ${response.status}`);
      return 0;
    }

    const data: BitgetTicker[] = await response.json();
    if (data && data.length > 0 && data[0].lastPr) {
      return parseFloat(data[0].lastPr);
    }
    return 0;
  } catch (error) {
    console.warn(`⚠️ Error fetching Bitget ticker for ${symbol}:`, error);
    return 0;
  }
}

// Bitget: Fetch prices for multiple assets concurrently
export async function getBitgetPrices(assets: string[]): Promise<{ [key: string]: number }> {
  console.log('💱 Fetching Bitget prices for assets:', assets);
  
  const prices: { [key: string]: number } = {};
  
  // Hardcoded prices for stablecoins
  const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP'];
  stablecoins.forEach(coin => {
    if (assets.includes(coin)) {
      prices[coin] = 1;
    }
  });
  
  // Fetch prices for non-stablecoins
  const nonStableAssets = assets.filter(asset => !stablecoins.includes(asset));
  
  const pricePromises = nonStableAssets.map(async (asset) => {
    // Bitget uses symbol format like "BTCUSDT", "ETHUSDT"
    const symbol = `${asset}USDT`.toLowerCase();
    const price = await getBitgetTicker(symbol);
    return { asset, price };
  });
  
  const results = await Promise.all(pricePromises);
  results.forEach(({ asset, price }) => {
    prices[asset] = price;
  });
  
  console.log('✅ Bitget prices fetched:', prices);
  return prices;
}

// Bitget: Get Spot Account Assets
export async function getBitgetSpotAssets(credentials?: ApiCredentials): Promise<BitgetAsset[]> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔵 BITGET API CALL: getBitgetSpotAssets');
  console.log('   URL:', `${API_BASE_URL}/bitget/account/spot/assets`);
  
  console.log('🔐 Bitget Credentials:', credentials ? {
    hasApiKey: !!credentials.apiKey,
    hasSecretKey: !!credentials.secretKey,
    hasPassphrase: !!credentials.passphrase,
    apiKeyPreview: credentials.apiKey?.substring(0, 8) + '...'
  } : 'NO CREDENTIALS PROVIDED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': '*/*',
    };
    
    // Add credentials to headers if available
    if (credentials) {
      headers['x-api-key'] = credentials.apiKey;
      headers['x-secret-key'] = credentials.secretKey;
      if (credentials.passphrase) {
        headers['x-passphrase'] = credentials.passphrase;
      }
    }
    
    console.log('📤 Request Headers:', Object.keys(headers));
    
    const response = await fetch(`${API_BASE_URL}/bitget/account/spot/assets`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('❌ Bitget API Error:', response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: BitgetAsset[] = await response.json();
    console.log('✅ BITGET RAW RESPONSE:', JSON.stringify(data, null, 2));
    console.log('   Assets Count:', data.length);
    return data;
  } catch (error) {
    console.error('❌ Bitget Spot Assets error:', error);
    throw error;
  }
}

// ============================================
// NORMALIZATION FUNCTIONS (Multi-Exchange)
// ============================================

// Normalize Bitget assets to Binance UserAsset format with USD values
export async function normalizeBitgetToUserAsset(bitgetAssets: BitgetAsset[]): Promise<NormalizedUserAsset[]> {
  console.log('🔄 normalizeBitgetToUserAsset - Input:', bitgetAssets);
  
  // Fetch prices for all assets
  const assetNames = bitgetAssets.map(asset => asset.coin);
  const prices = await getBitgetPrices(assetNames);
  console.log('💱 Prices for normalization:', prices);
  
  const normalized = bitgetAssets.map(asset => {
    const total = parseFloat(asset.available) + parseFloat(asset.locked) + parseFloat(asset.frozen);
    const pricePerUnit = prices[asset.coin] || 0;
    const usdValue = total * pricePerUnit;
    
    return {
      asset: asset.coin,
      free: asset.available,
      locked: asset.locked,
      freeze: asset.frozen,
      withdrawing: '0', // Bitget doesn't provide this
      ipoable: '0', // Bitget doesn't provide this
      btcValuation: '0', // Bitget doesn't provide this directly
      exchange: 'bitget' as const,
      usdValue,
      pricePerUnit
    };
  });
  
  console.log('✅ normalizeBitgetToUserAsset - Output:', normalized);
  return normalized;
}

// Normalize Binance UserAssets to include exchange tag and USD values
export async function normalizeBinanceUserAsset(binanceAssets: UserAsset[]): Promise<NormalizedUserAsset[]> {
  console.log('🔄 normalizeBinanceUserAsset - Input:', binanceAssets);
  
  // Fetch BTC price to convert btcValuation to USD
  let btcPrice = 113200; // Fallback price
  try {
    const btcPriceResponse = await fetch(`${API_BASE_URL}/binance/ticker?symbol=BTCUSDT`);
    if (btcPriceResponse.ok) {
      const btcData = await btcPriceResponse.json();
      btcPrice = parseFloat(btcData.price);
      console.log('💱 BTC Price fetched:', btcPrice);
    }
  } catch (error) {
    console.warn('⚠️ Failed to fetch BTC price, using fallback:', btcPrice);
  }
  
  // Fetch prices for all assets to get individual prices
  const assetNames = binanceAssets.map(asset => asset.asset);
  const prices: { [key: string]: number } = {};
  
  // Hardcoded prices for stablecoins
  const stablecoins = ['USDT', 'USDC', 'BUSD', 'DAI', 'TUSD', 'USDP'];
  stablecoins.forEach(coin => {
    if (assetNames.includes(coin)) {
      prices[coin] = 1;
    }
  });
  
  // Fetch prices for non-stablecoins from Binance
  const nonStableAssets = assetNames.filter(asset => !stablecoins.includes(asset));
  const pricePromises = nonStableAssets.map(async (asset) => {
    try {
      const symbol = `${asset}USDT`;
      const response = await fetch(`${API_BASE_URL}/binance/ticker?symbol=${symbol}`);
      if (response.ok) {
        const data = await response.json();
        return { asset, price: parseFloat(data.price) };
      }
    } catch (error) {
      console.warn(`⚠️ Failed to fetch price for ${asset}`);
    }
    return { asset, price: 0 };
  });
  
  const priceResults = await Promise.all(pricePromises);
  priceResults.forEach(({ asset, price }) => {
    prices[asset] = price;
  });
  
  console.log('💱 Binance prices fetched:', prices);
  
  const normalized = binanceAssets.map(asset => {
    const total = parseFloat(asset.free) + parseFloat(asset.locked) + 
                  parseFloat(asset.freeze) + parseFloat(asset.withdrawing) + 
                  parseFloat(asset.ipoable);
    
    let usdValue = 0;
    let pricePerUnit = prices[asset.asset] || 0;
    
    // Calculate USD value
    if (asset.btcValuation && parseFloat(asset.btcValuation) > 0) {
      // Use btcValuation if available (most accurate from Binance)
      usdValue = parseFloat(asset.btcValuation) * btcPrice;
    } else if (pricePerUnit > 0) {
      // Use fetched price
      usdValue = total * pricePerUnit;
    }
    
    return {
      ...asset,
      exchange: 'binance' as const,
      usdValue,
      pricePerUnit
    };
  });
  
  console.log('✅ normalizeBinanceUserAsset - Output:', normalized.slice(0, 3));
  return normalized;
}

// Normalize Bitget assets to AccountInfo balances format
export function normalizeBitgetToAccountInfo(bitgetAssets: BitgetAsset[]): NormalizedAccountInfo {
  console.log('🔄 normalizeBitgetToAccountInfo - Input:', bitgetAssets);
  
  const normalized = {
    makerCommission: 0, // Bitget doesn't provide this in assets endpoint
    takerCommission: 0,
    buyerCommission: 0,
    sellerCommission: 0,
    canTrade: true, // Assume true if we can fetch assets
    canWithdraw: true,
    canDeposit: true,
    updateTime: parseInt(bitgetAssets[0]?.uTime || Date.now().toString()),
    accountType: 'SPOT',
    balances: bitgetAssets.map(asset => ({
      asset: asset.coin,
      free: parseFloat(asset.available),
      locked: parseFloat(asset.locked),
      total: parseFloat(asset.available) + parseFloat(asset.locked),
      usdValue: 0, // Would need price data
      pricePerUnit: 0
    })),
    permissions: ['SPOT'], // Bitget SPOT account
    exchange: 'bitget' as const
  };
  
  console.log('✅ normalizeBitgetToAccountInfo - Output:', {
    accountType: normalized.accountType,
    balancesCount: normalized.balances.length,
    balances: normalized.balances
  });
  
  return normalized;
}

// Normalize Bitget assets to AccountSnapshotResponse format (single-point snapshot)
export async function normalizeBitgetToAccountSnapshot(bitgetAssets: BitgetAsset[]): Promise<AccountSnapshotResponse> {
  console.log('🔄 normalizeBitgetToAccountSnapshot - Input:', bitgetAssets);
  
  // Extract unique asset names
  const assetNames = bitgetAssets.map(asset => asset.coin);
  
  // Fetch real-time prices from Bitget ticker API
  const prices = await getBitgetPrices(assetNames);
  console.log('💱 Real-time prices fetched:', prices);
  
  const today = new Date().toISOString().split('T')[0];
  
  // Calculate balances with USD values using real prices
  const balances: Balance[] = bitgetAssets.map(asset => {
    const total = parseFloat(asset.available) + parseFloat(asset.locked) + parseFloat(asset.frozen);
    const pricePerUnit = prices[asset.coin] || 0; // Use real price or 0 if unavailable
    const usdValue = total * pricePerUnit;
    
    return {
      asset: asset.coin,
      free: parseFloat(asset.available),
      locked: parseFloat(asset.locked) + parseFloat(asset.frozen),
      total,
      usdValue,
      pricePerUnit
    };
  });
  
  const totalValueUSD = balances.reduce((sum, b) => sum + b.usdValue, 0);
  const btcPrice = prices['BTC'] || 113200; // Fallback to approximate if BTC price fetch fails
  const totalAssetOfBtc = totalValueUSD / btcPrice;
  
  // Filter assets with value > 0 for top assets
  const topAssetsData = balances
    .filter(b => b.usdValue > 0)
    .sort((a, b) => b.usdValue - a.usdValue)
    .slice(0, 10);
  
  const topAssets: TopAsset[] = topAssetsData.map(asset => ({
    asset: asset.asset,
    value: asset.usdValue.toFixed(2),
    percentage: totalValueUSD > 0 ? ((asset.usdValue / totalValueUSD) * 100).toFixed(1) : '0'
  }));
  
  const snapshot: Snapshot = {
    date: today,
    totalValueUSD,
    totalAssetOfBtc,
    balances,
    updateTime: parseInt(bitgetAssets[0]?.uTime || Date.now().toString()),
    change24h: 0, // No historical data
    pricesUsed: prices
  };
  
  const result: AccountSnapshotResponse = {
    totalSnapshots: 1,
    period: 'SPOT',
    snapshots: [snapshot],
    currentValue: totalValueUSD,
    initialValue: totalValueUSD,
    meaningfulInitialValue: totalValueUSD,
    performance: {
      totalReturn: '0.00', // No historical data
      rawTotalReturn: '0.00',
      days: 0,
      avgDailyReturn: '0.00'
    },
    summary: {
      totalPortfolioValue: totalValueUSD.toFixed(2),
      topAssets,
      assetPricesUsed: prices
    }
  };
  
  console.log('✅ normalizeBitgetToAccountSnapshot - Output:', {
    totalSnapshots: result.totalSnapshots,
    currentValue: result.currentValue,
    topAssetsCount: result.summary.topAssets.length
  });
  
  return result;
}

// ============================================
// MULTI-EXCHANGE WRAPPER FUNCTIONS
// ============================================

// Get account info based on selected exchange
export async function getAccountInfoByExchange(
  exchange: 'binance' | 'bitget',
  credentials?: ApiCredentials
): Promise<NormalizedAccountInfo> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🌐 getAccountInfoByExchange CALLED');
  console.log('   Exchange:', exchange);
  console.log('   Has Credentials:', !!credentials);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (exchange === 'binance') {
    console.log('📞 Calling Binance API: getAccountInfo()');
    const binanceData = await getAccountInfo(credentials);
    console.log('✅ Binance Response:', {
      accountType: binanceData.accountType,
      balancesCount: binanceData.balances.length,
      firstBalance: binanceData.balances[0]
    });
    return {
      ...binanceData,
      exchange: 'binance' as const
    };
  } else {
    console.log('📞 Calling Bitget API: getBitgetSpotAssets()');
    const bitgetAssets = await getBitgetSpotAssets(credentials);
    console.log('✅ Bitget Response:', {
      assetsCount: bitgetAssets.length,
      firstAsset: bitgetAssets[0],
      allAssets: bitgetAssets
    });
    const normalized = normalizeBitgetToAccountInfo(bitgetAssets);
    console.log('✅ Normalized Bitget Data:', {
      accountType: normalized.accountType,
      balancesCount: normalized.balances.length,
      firstBalance: normalized.balances[0]
    });
    return normalized;
  }
}

// Get user assets based on selected exchange
export async function getUserAssetsByExchange(
  exchange: 'binance' | 'bitget',
  credentials?: ApiCredentials
): Promise<NormalizedUserAsset[]> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 getUserAssetsByExchange CALLED');
  console.log('   Exchange:', exchange);
  console.log('   Has Credentials:', !!credentials);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (exchange === 'binance') {
    console.log('📞 Calling Binance API: getUserAssets()');
    const binanceAssets = await getUserAssets(credentials);
    console.log('✅ Binance Assets Response:', {
      count: binanceAssets.length,
      firstAsset: binanceAssets[0],
      sample: binanceAssets.slice(0, 2)
    });
    const normalized = await normalizeBinanceUserAsset(binanceAssets);
    console.log('✅ Normalized Binance Assets:', normalized.slice(0, 2));
    return normalized;
  } else {
    console.log('📞 Calling Bitget API: getBitgetSpotAssets()');
    const bitgetAssets = await getBitgetSpotAssets(credentials);
    console.log('✅ Bitget Assets Response:', {
      count: bitgetAssets.length,
      firstAsset: bitgetAssets[0],
      allAssets: bitgetAssets
    });
    const normalized = await normalizeBitgetToUserAsset(bitgetAssets);
    console.log('✅ Normalized Bitget Assets:', normalized);
    return normalized;
  }
}

// Get open orders based on selected exchange
export async function getOpenOrdersByExchange(
  exchange: 'binance' | 'bitget',
  symbol?: string,
  credentials?: ApiCredentials
): Promise<Order[] | BitgetOrder[]> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 getOpenOrdersByExchange CALLED');
  console.log('   Exchange:', exchange);
  console.log('   Symbol:', symbol || 'All symbols');
  console.log('   Has Credentials:', !!credentials);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (exchange === 'binance') {
    console.log('📞 Calling Binance API: getOpenOrders()');
    const binanceOrders = await getOpenOrders(symbol, credentials);
    console.log('✅ Binance Open Orders Response:', {
      count: binanceOrders.length,
      firstOrder: binanceOrders[0]
    });
    return binanceOrders;
  } else {
    console.log('📞 Calling Bitget API: getBitgetOpenOrders()');
    const bitgetResponse = await getBitgetOpenOrders(symbol, credentials);
    console.log('✅ Bitget Open Orders Response:', {
      totalOrders: bitgetResponse.totalOrders,
      breakdown: bitgetResponse.breakdown
    });
    return bitgetResponse.orders;
  }
}

// Get account snapshot based on selected exchange
export async function getAccountSnapshotByExchange(
  exchange: 'binance' | 'bitget',
  credentials?: ApiCredentials
): Promise<AccountSnapshotResponse> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 getAccountSnapshotByExchange CALLED');
  console.log('   Exchange:', exchange);
  console.log('   Has Credentials:', !!credentials);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (exchange === 'binance') {
    console.log('📞 Calling Binance API: getAccountSnapshot()');
    const binanceSnapshot = await getAccountSnapshot(credentials);
    console.log('✅ Binance Snapshot Response:', {
      totalSnapshots: binanceSnapshot.totalSnapshots,
      currentValue: binanceSnapshot.currentValue,
      performance: binanceSnapshot.performance
    });
    return binanceSnapshot;
  } else {
    console.log('📞 Calling Bitget API: getBitgetSpotAssets() + normalization');
    const bitgetAssets = await getBitgetSpotAssets(credentials);
    console.log('✅ Bitget Assets Response:', {
      count: bitgetAssets.length,
      assets: bitgetAssets
    });
    const normalized = await normalizeBitgetToAccountSnapshot(bitgetAssets);
    console.log('✅ Normalized Bitget Snapshot:', {
      totalSnapshots: normalized.totalSnapshots,
      currentValue: normalized.currentValue,
      topAssets: normalized.summary.topAssets
    });
    return normalized;
  }
}