export interface NormalizedBalance {
  asset: string;
  free: string;
  locked: string;
  total: string;
}

export interface NormalizedAccountInfo {
  exchangeName: string;
  accountType?: string;
  canTrade?: boolean;
  canWithdraw?: boolean;
  canDeposit?: boolean;
  permissions?: string[];
  balances: NormalizedBalance[];
  updateTime?: number;
  commission?: {
    maker: number;
    taker: number;
  };
  // Bitget specific fields (optional)
  userId?: string;
  inviterId?: string;
  authorities?: string[];
  ips?: string;
  // Binance specific fields (optional)
  uid?: number;
  brokered?: boolean;
}