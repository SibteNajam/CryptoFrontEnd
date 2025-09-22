// infrastructure/api/WalletApi.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

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