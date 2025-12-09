// tradePairingLogic.ts - Exact implementation of trade pairing algorithm

export interface TradeHistory {
  tradeId: string;
  orderId: string;
  symbol: string;
  side: string;
  price?: string;
  priceAvg?: string;
  amount?: string;
  size: string;
  feeDetail: any;
  cTime: string;
}

export interface TradePair {
  dateRange: string;
  buys: TradeHistory[];
  sells: TradeHistory[];
  pnl: number | null;
  pnlPercent: number | null;
  avgBuyPrice: number | null;
  totalBuySize: number | null;
  totalBuyCost: number | null;
  avgSellPrice: number | null;
  totalSellSize: number | null;
  totalSellRevenue: number | null;
}

/**
 * Groups trades into pairs based on position tracking
 * Key logic:
 * 1. Sorts trades chronologically (oldest first)
 * 2. Tracks net position (buys - sells)
 * 3. Creates a pair when position closes (net ≈ 0)
 * 4. Handles cross-day positions
 * 5. Accounts for fees in both asset and USDT
 */
export function createTradePairs(trades: TradeHistory[]): TradePair[] {
  // Sort trades by date ASCENDING (oldest first) for proper pairing
  const sortedTrades = [...trades].sort((a, b) => Number(a.cTime) - Number(b.cTime));

  const pairs: TradePair[] = [];
  let currentBuys: TradeHistory[] = [];
  let currentSells: TradeHistory[] = [];
  let netPosition = 0; // Track net position (buys - sells)

  for (const trade of sortedTrades) {
    const size = parseFloat(trade.size || '0');

    if (trade.side === 'buy') {
      currentBuys.push(trade);
      netPosition += size;
    } else if (trade.side === 'sell') {
      currentSells.push(trade);
      netPosition -= size;
    }

    // Check if position is closed (or nearly closed, accounting for small rounding errors)
    if (Math.abs(netPosition) < 0.001 && currentBuys.length > 0 && currentSells.length > 0) {
      // Position is closed - create a pair
      const pair = calculatePairMetrics(currentBuys, currentSells);
      pairs.push(pair);

      // Reset for next position
      currentBuys = [];
      currentSells = [];
      netPosition = 0;
    }
  }

  // Handle remaining open position (unpaired orders)
  if (currentBuys.length > 0 || currentSells.length > 0) {
    const pair = calculatePairMetrics(currentBuys, currentSells);
    pairs.push(pair);
  }

  // Reverse to show newest first in UI
  return pairs.reverse();
}

/**
 * Calculate metrics for a pair of buy and sell orders
 * Handles:
 * - Fee deduction in both asset and USDT
 * - Average price calculation
 * - PNL calculation
 * - Date range formatting
 */
function calculatePairMetrics(buys: TradeHistory[], sells: TradeHistory[]): TradePair {
  const allTrades = [...buys, ...sells].sort((a, b) => Number(a.cTime) - Number(b.cTime));
  const firstTradeDate = new Date(Number(allTrades[0].cTime));
  const lastTradeDate = new Date(Number(allTrades[allTrades.length - 1].cTime));

  const startDate = firstTradeDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endDate = lastTradeDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const dateRange = startDate === endDate ? startDate : `${startDate} - ${endDate}`;

  // === BUY CALCULATIONS ===
  let totalBuySize = 0;
  let totalBuyCost = 0;

  for (const buy of buys) {
    const buySize = parseFloat(buy.size || '0');
    const price = parseFloat(buy.price || '0');
    let effectiveSize = buySize;

    // If fee is paid in the asset (not USDT), subtract it from received amount
    if (buy.feeDetail && buy.feeDetail.feeCoin !== 'USDT') {
      const feeInAsset = Math.abs(parseFloat(buy.feeDetail.totalFee || '0'));
      effectiveSize = buySize - feeInAsset;
    }

    totalBuySize += effectiveSize;
    totalBuyCost += buySize * price;

    // If fee is paid in USDT, add it to total cost
    if (buy.feeDetail && buy.feeDetail.feeCoin === 'USDT') {
      totalBuyCost += Math.abs(parseFloat(buy.feeDetail.totalFee || '0'));
    }
  }
  const avgBuyPrice = totalBuySize > 0 ? totalBuyCost / totalBuySize : null;

  // === SELL CALCULATIONS ===
  let totalSellSize = 0;
  let totalSellRevenue = 0;

  for (const sell of sells) {
    const sellSize = parseFloat(sell.size || '0');
    const price = parseFloat(sell.price || '0');
    totalSellSize += sellSize;
    totalSellRevenue += sellSize * price;

    // Subtract fees from revenue
    if (sell.feeDetail) {
      if (sell.feeDetail.feeCoin === 'USDT') {
        totalSellRevenue -= Math.abs(parseFloat(sell.feeDetail.totalFee || '0'));
      } else {
        // Fee in asset - convert to USDT value
        const feeInAsset = Math.abs(parseFloat(sell.feeDetail.totalFee || '0'));
        totalSellRevenue -= feeInAsset * price;
      }
    }
  }
  const avgSellPrice = totalSellSize > 0 ? totalSellRevenue / totalSellSize : null;

  // === PNL CALCULATION ===
  let pnl: number | null = null;
  let pnlPercent: number | null = null;
  if (totalBuySize > 0 && totalSellSize > 0 && avgBuyPrice !== null) {
    const matchedSize = Math.min(totalBuySize, totalSellSize);
    const costBasis = matchedSize * avgBuyPrice;
    pnl = totalSellRevenue - costBasis;
    pnlPercent = (pnl / costBasis) * 100;
  }

  return {
    dateRange,
    buys,
    sells,
    pnl,
    pnlPercent,
    avgBuyPrice,
    totalBuySize: totalBuySize || null,
    totalBuyCost: totalBuyCost || null,
    avgSellPrice,
    totalSellSize: totalSellSize || null,
    totalSellRevenue: totalSellRevenue || null,
  };
}

/**
 * Helper to check if an order is from a different date than the primary group
 * Used to highlight "moved orders" with purple background
 */
export function isMovedOrder(order: TradeHistory, primaryOrders: TradeHistory[]): boolean {
  if (primaryOrders.length === 0) return false;
  
  const primaryDate = new Date(Number(primaryOrders[0].cTime)).toDateString();
  const orderDate = new Date(Number(order.cTime)).toDateString();
  
  return primaryDate !== orderDate;
}

/**
 * Get the day number for display on moved orders
 */
export function getOrderDay(order: TradeHistory): number {
  return new Date(Number(order.cTime)).getDate();
}
