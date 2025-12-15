// infrastructure/api/WalletApi.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

// ============================================
// BINANCE TYPES
// ============================================

export interface DepositHistoryResponse {
  total: number;
  deposits: Deposit[];
  summary: {
    pending: number;
    creditedButCannotWithdraw: number;
    wrongDeposit: number;
    waitingUserConfirm: number;
    success: number;
    rejected: number;
    totalAmount: string;
  };
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
  completeTime: number;
  transferType: number;
  confirmTimes: string;
  unlockConfirm: number;
  walletType: number;
  travelRuleStatus: number;
}

// ============================================
// BITGET TYPES
// ============================================

export interface BitgetDepositRecord {
  orderId: string;
  tradeId: string;
  coin: string;
  type: string; // "deposit"
  size: string;
  status: string; // "success", "pending", etc.
  toAddress: string;
  dest: string; // "on_chain"
  chain: string; // e.g., "Plasma(Plasma)", "AVAXC(AVAX C-Chain)"
  fromAddress: string;
  cTime: string; // Creation timestamp in ms
  uTime: string; // Update timestamp in ms
}

export interface BitgetWithdrawalRecord {
  orderId: string;
  tradeId: string;
  coin: string;
  type: string; // "withdrawal"
  size: string;
  status: string; // "success", "pending", etc.
  toAddress: string;
  dest: string; // "on_chain"
  chain: string;
  fromAddress: string;
  fee?: string;
  cTime: string;
  uTime: string;
}

// ============================================
// NORMALIZED TYPES (Multi-Exchange)
// ============================================

export interface NormalizedDeposit {
  id: string;
  amount: string;
  coin: string;
  network: string;
  status: 'pending' | 'success' | 'failed' | 'unknown';
  address: string;
  txId: string;
  timestamp: number; // Unified timestamp in ms
  exchange: 'binance' | 'bitget';
}

export interface NormalizedWithdrawal {
  id: string;
  amount: string;
  coin: string;
  network: string;
  status: 'pending' | 'success' | 'failed' | 'unknown';
  address: string;
  txId: string;
  fee?: string;
  timestamp: number; // Unified timestamp in ms
  exchange: 'binance' | 'bitget';
}

export interface NormalizedTransactionResponse {
  total: number;
  transactions: NormalizedDeposit[] | NormalizedWithdrawal[];
  exchange: 'binance' | 'bitget';
}

export interface WithdrawHistoryResponse {
  total: number;
  withdrawals: Withdrawal[];
  summary: {
    emailSent: number;
    awaitingApproval: number;
    rejected: number;
    processing: number;
    completed: number;
    totalAmount: string;
    totalFees: string;
  };
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
  network?: string;
  transferType: number;
  withdrawOrderId?: string;
  info: string;
  confirmNo: number;
  walletType: number;
  txKey: string;
  completeTime?: string;
}

// Helper to normalize Bitget deposit to NormalizedDeposit
function normalizeBitgetDeposit(deposit: BitgetDepositRecord): NormalizedDeposit {
  return {
    id: deposit.orderId,
    amount: deposit.size,
    coin: deposit.coin,
    network: deposit.chain.split('(')[0].trim(), // Extract network name
    status: normalizeStatus(deposit.status),
    address: deposit.toAddress,
    txId: deposit.tradeId,
    timestamp: parseInt(deposit.cTime),
    exchange: 'bitget' as const,
  };
}

// Helper to normalize Bitget withdrawal to NormalizedWithdrawal
function normalizeBitgetWithdrawal(withdrawal: BitgetWithdrawalRecord): NormalizedWithdrawal {
  return {
    id: withdrawal.orderId,
    amount: withdrawal.size,
    coin: withdrawal.coin,
    network: withdrawal.chain.split('(')[0].trim(), // Extract network name
    status: normalizeStatus(withdrawal.status),
    address: withdrawal.toAddress,
    txId: withdrawal.tradeId,
    fee: withdrawal.fee,
    timestamp: parseInt(withdrawal.cTime),
    exchange: 'bitget' as const,
  };
}

// Helper to normalize Binance deposit to NormalizedDeposit
function normalizeBinanceDeposit(deposit: Deposit): NormalizedDeposit {
  let status: 'pending' | 'success' | 'failed' | 'unknown' = 'unknown';
  switch (deposit.status) {
    case 0:
      status = 'pending';
      break;
    case 1:
      status = 'success';
      break;
    case 2:
    case 6:
    case 7:
      status = 'failed';
      break;
  }
  
  return {
    id: deposit.id,
    amount: deposit.amount,
    coin: deposit.coin,
    network: deposit.network,
    status,
    address: deposit.address,
    txId: deposit.txId,
    timestamp: deposit.insertTime,
    exchange: 'binance' as const,
  };
}

// Helper to normalize Binance withdrawal to NormalizedWithdrawal
function normalizeBinanceWithdrawal(withdrawal: Withdrawal): NormalizedWithdrawal {
  let status: 'pending' | 'success' | 'failed' | 'unknown' = 'unknown';
  switch (withdrawal.status) {
    case 0:
    case 1:
      status = 'pending';
      break;
    case 2:
      status = 'success';
      break;
    case 3:
    case 4:
    case 5:
      status = 'failed';
      break;
  }
  
  return {
    id: withdrawal.id,
    amount: withdrawal.amount,
    coin: withdrawal.coin,
    network: withdrawal.network || 'Unknown',
    status,
    address: withdrawal.address,
    txId: withdrawal.txId,
    fee: withdrawal.transactionFee,
    timestamp: parseInt(withdrawal.applyTime),
    exchange: 'binance' as const,
  };
}

// Helper function to normalize status strings
function normalizeStatus(status: string): 'pending' | 'success' | 'failed' | 'unknown' {
  const lowerStatus = status.toLowerCase();
  if (lowerStatus === 'success') return 'success';
  if (lowerStatus.includes('pending') || lowerStatus.includes('processing')) return 'pending';
  if (lowerStatus.includes('fail') || lowerStatus.includes('rejected') || lowerStatus.includes('cancel')) return 'failed';
  return 'unknown';
}

export interface SecurityInfoResponse {
  isSecure: boolean;
  ipRestricted: boolean;
  apiKeyCreated: string;
  canTradeSpot: boolean;
  canTradeFutures: boolean;
  canWithdraw: boolean;
  canInternalTransfer: boolean;
  recommendations: string[];
  advancedFeatures: {
    marginTrading: boolean;
    optionsTrading: boolean;
    portfolioMargin: boolean;
  };
  lastUpdated: string;
}

export async function getDepositHistory(): Promise<DepositHistoryResponse> {
  console.log('🔄 Fetching Deposit History...');

  try {
    const response = await fetch(`${API_BASE_URL}/binance/deposit-history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: DepositHistoryResponse = await response.json();
    console.log('✅ Deposit History loaded successfully', {
      total: data.total,
      success: data.summary.success
    });
    return data;
  } catch (error) {
    console.error('❌ Deposit History error:', error);
    throw error;
  }
}

// Bitget: Get Deposit History
export async function getBitgetDepositHistory(credentials?: any): Promise<BitgetDepositRecord[]> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔵 BITGET API CALL: getBitgetDepositHistory');
  console.log('   URL:', `${API_BASE_URL}/bitget/account/deposit-history`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': '*/*',
    };
    
    const response = await fetch(`${API_BASE_URL}/bitget/account/deposit-history`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('❌ Bitget Deposit History API Error:', response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: BitgetDepositRecord[] = await response.json();
    console.log('✅ BITGET DEPOSIT HISTORY RESPONSE:', {
      count: data.length,
      sample: data.slice(0, 2)
    });
    return data;
  } catch (error) {
    console.error('❌ Bitget Deposit History error:', error);
    throw error;
  }
}

// Multi-Exchange: Get Deposit History
export async function getDepositHistoryByExchange(
  exchange: 'binance' | 'bitget',
  credentials?: any
): Promise<NormalizedTransactionResponse> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 getDepositHistoryByExchange CALLED');
  console.log('   Exchange:', exchange);
  console.log('   Has Credentials:', !!credentials);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (exchange === 'binance') {
    console.log('📞 Calling Binance API: getDepositHistory()');
    const binanceResponse = await getDepositHistory();
    console.log('✅ Binance Response:', {
      total: binanceResponse.total,
      deposits: binanceResponse.deposits.length
    });
    
    const normalized = binanceResponse.deposits.map(d => normalizeBinanceDeposit(d));
    return {
      total: binanceResponse.total,
      transactions: normalized,
      exchange: 'binance' as const,
    };
  } else {
    console.log('📞 Calling Bitget API: getBitgetDepositHistory()');
    const bitgetResponse = await getBitgetDepositHistory(credentials);
    console.log('✅ Bitget Response:', {
      count: bitgetResponse.length
    });
    
    const normalized = bitgetResponse.map(d => normalizeBitgetDeposit(d));
    return {
      total: bitgetResponse.length,
      transactions: normalized,
      exchange: 'bitget' as const,
    };
  }
}

export async function getWithdrawHistory(): Promise<WithdrawHistoryResponse> {
  console.log('🔄 Fetching Withdrawal History...');

  try {
    const response = await fetch(`${API_BASE_URL}/binance/withdraw-history`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: WithdrawHistoryResponse = await response.json();
    console.log('✅ Withdrawal History loaded successfully', {
      total: data.total,
      completed: data.summary.completed
    });
    return data;
  } catch (error) {
    console.error('❌ Withdrawal History error:', error);
    throw error;
  }
}

// Bitget: Get Withdrawal History
export async function getBitgetWithdrawalHistory(credentials?: any): Promise<BitgetWithdrawalRecord[]> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔵 BITGET API CALL: getBitgetWithdrawalHistory');
  console.log('   URL:', `${API_BASE_URL}/bitget/account/withdrawal-history`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': '*/*',
    };
   
    const response = await fetch(`${API_BASE_URL}/bitget/account/withdrawal-history`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('❌ Bitget Withdrawal History API Error:', response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: BitgetWithdrawalRecord[] = await response.json();
    console.log('✅ BITGET WITHDRAWAL HISTORY RESPONSE:', {
      count: data.length,
      sample: data.slice(0, 2)
    });
    return data;
  } catch (error) {
    console.error('❌ Bitget Withdrawal History error:', error);
    throw error;
  }
}

// Multi-Exchange: Get Withdrawal History
export async function getWithdrawalHistoryByExchange(
  exchange: 'binance' | 'bitget',
  credentials?: any
): Promise<NormalizedTransactionResponse> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 getWithdrawalHistoryByExchange CALLED');
  console.log('   Exchange:', exchange);
  console.log('   Has Credentials:', !!credentials);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (exchange === 'binance') {
    console.log('📞 Calling Binance API: getWithdrawHistory()');
    const binanceResponse = await getWithdrawHistory();
    console.log('✅ Binance Response:', {
      total: binanceResponse.total,
      withdrawals: binanceResponse.withdrawals.length
    });
    
    const normalized = binanceResponse.withdrawals.map(w => normalizeBinanceWithdrawal(w));
    return {
      total: binanceResponse.total,
      transactions: normalized,
      exchange: 'binance' as const,
    };
  } else {
    console.log('📞 Calling Bitget API: getBitgetWithdrawalHistory()');
    const bitgetResponse = await getBitgetWithdrawalHistory(credentials);
    console.log('✅ Bitget Response:', {
      count: bitgetResponse.length
    });
    
    const normalized = bitgetResponse.map(w => normalizeBitgetWithdrawal(w));
    return {
      total: bitgetResponse.length,
      transactions: normalized,
      exchange: 'bitget' as const,
    };
  }
}

export async function getSecurityInfo(): Promise<SecurityInfoResponse> {
  console.log('🔄 Fetching Security Information...');

  try {
    const response = await fetch(`${API_BASE_URL}/binance/security`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: SecurityInfoResponse = await response.json();
    console.log('✅ Security Information loaded successfully', {
      isSecure: data.isSecure,
      ipRestricted: data.ipRestricted
    });
    return data;
  } catch (error) {
    console.error('❌ Security Information error:', error);
    throw error;
  }
}