// tradePairingLogic.test.ts - Test cases for trade pairing algorithm

import { createTradePairs, isMovedOrder, getOrderDay, TradeHistory } from './tradePairingLogic';

// Helper to create mock trades
function createTrade(
  tradeId: string,
  side: 'buy' | 'sell',
  price: string,
  size: string,
  timestamp: number,
  feeDetail?: any
): TradeHistory {
  return {
    tradeId,
    orderId: `order-${tradeId}`,
    symbol: 'BTCUSDT',
    side,
    price,
    size,
    amount: (parseFloat(price) * parseFloat(size)).toString(),
    feeDetail: feeDetail || { feeCoin: 'USDT', totalFee: '0' },
    cTime: timestamp.toString(),
  };
}

// Test 1: Simple same-day buy-sell pair
console.log('=== Test 1: Simple Same-Day Pair ===');
const test1Trades: TradeHistory[] = [
  createTrade('1', 'buy', '40000', '1', Date.parse('2024-12-05 09:00:00')),
  createTrade('2', 'sell', '41000', '1', Date.parse('2024-12-05 15:00:00')),
];
const test1Pairs = createTradePairs(test1Trades);
console.log('Result:', {
  pairs: test1Pairs.length,
  dateRange: test1Pairs[0]?.dateRange,
  pnl: test1Pairs[0]?.pnl?.toFixed(2),
  pnlPercent: test1Pairs[0]?.pnlPercent?.toFixed(2),
});
console.log('Expected: 1 pair, same day, +$1000 PNL (+2.5%)\n');

// Test 2: Multiple buys, one sell (same day)
console.log('=== Test 2: Multiple Buys, One Sell ===');
const test2Trades: TradeHistory[] = [
  createTrade('1', 'buy', '40000', '1', Date.parse('2024-12-05 09:00:00')),
  createTrade('2', 'buy', '40500', '0.5', Date.parse('2024-12-05 10:00:00')),
  createTrade('3', 'sell', '41000', '1.5', Date.parse('2024-12-05 11:00:00')),
];
const test2Pairs = createTradePairs(test2Trades);
console.log('Result:', {
  pairs: test2Pairs.length,
  buys: test2Pairs[0]?.buys.length,
  sells: test2Pairs[0]?.sells.length,
  avgBuyPrice: test2Pairs[0]?.avgBuyPrice?.toFixed(2),
  pnl: test2Pairs[0]?.pnl?.toFixed(2),
  pnlPercent: test2Pairs[0]?.pnlPercent?.toFixed(2),
});
console.log('Expected: 1 pair, 2 buys, 1 sell, avg buy ~$40,166.67, +$1,250 PNL (+2.07%)\n');

// Test 3: Cross-day position
console.log('=== Test 3: Cross-Day Position ===');
const test3Trades: TradeHistory[] = [
  createTrade('1', 'buy', '40000', '2', Date.parse('2024-12-05 09:00:00')),
  createTrade('2', 'buy', '39500', '1', Date.parse('2024-12-06 10:00:00')),
  createTrade('3', 'sell', '41000', '3', Date.parse('2024-12-07 15:00:00')),
];
const test3Pairs = createTradePairs(test3Trades);
console.log('Result:', {
  pairs: test3Pairs.length,
  dateRange: test3Pairs[0]?.dateRange,
  buys: test3Pairs[0]?.buys.length,
  sells: test3Pairs[0]?.sells.length,
  pnl: test3Pairs[0]?.pnl?.toFixed(2),
});
console.log('Expected: 1 pair, "Dec 5 - Dec 7", 2 buys, 1 sell, positive PNL\n');

// Test 4: Moved orders (different days in same pair)
console.log('=== Test 4: Moved Orders ===');
const test4Trades: TradeHistory[] = [
  createTrade('1', 'buy', '39000', '0.5', Date.parse('2024-12-03 14:00:00')), // Dec 3
  createTrade('2', 'buy', '40000', '1', Date.parse('2024-12-05 09:00:00')),   // Dec 5
  createTrade('3', 'sell', '41000', '1.5', Date.parse('2024-12-05 15:00:00')), // Dec 5
];
const test4Pairs = createTradePairs(test4Trades);
const movedBuy = test4Pairs[0]?.buys[0];
console.log('Result:', {
  pairs: test4Pairs.length,
  dateRange: test4Pairs[0]?.dateRange,
  isFirstBuyMoved: movedBuy ? isMovedOrder(movedBuy, test4Pairs[0].buys) : false,
  movedDay: movedBuy ? getOrderDay(movedBuy) : null,
});
console.log('Expected: 1 pair, "Dec 3 - Dec 5", first buy is moved (day 3)\n');

// Test 5: Pending position (buys only)
console.log('=== Test 5: Pending Position ===');
const test5Trades: TradeHistory[] = [
  createTrade('1', 'buy', '40000', '1', Date.parse('2024-12-05 09:00:00')),
  createTrade('2', 'buy', '40500', '0.5', Date.parse('2024-12-05 10:00:00')),
];
const test5Pairs = createTradePairs(test5Trades);
console.log('Result:', {
  pairs: test5Pairs.length,
  buys: test5Pairs[0]?.buys.length,
  sells: test5Pairs[0]?.sells.length,
  pnl: test5Pairs[0]?.pnl,
});
console.log('Expected: 1 pair, 2 buys, 0 sells, null PNL\n');

// Test 6: Unmatched sells
console.log('=== Test 6: Unmatched Sells ===');
const test6Trades: TradeHistory[] = [
  createTrade('1', 'sell', '41000', '1', Date.parse('2024-12-05 10:00:00')),
];
const test6Pairs = createTradePairs(test6Trades);
console.log('Result:', {
  pairs: test6Pairs.length,
  buys: test6Pairs[0]?.buys.length,
  sells: test6Pairs[0]?.sells.length,
  pnl: test6Pairs[0]?.pnl,
});
console.log('Expected: 1 pair, 0 buys, 1 sell, null PNL\n');

// Test 7: Multiple complete pairs
console.log('=== Test 7: Multiple Complete Pairs ===');
const test7Trades: TradeHistory[] = [
  // First pair (Dec 5)
  createTrade('1', 'buy', '40000', '1', Date.parse('2024-12-05 09:00:00')),
  createTrade('2', 'sell', '41000', '1', Date.parse('2024-12-05 15:00:00')),
  // Second pair (Dec 6)
  createTrade('3', 'buy', '39000', '2', Date.parse('2024-12-06 10:00:00')),
  createTrade('4', 'sell', '40000', '2', Date.parse('2024-12-06 16:00:00')),
];
const test7Pairs = createTradePairs(test7Trades);
console.log('Result:', {
  totalPairs: test7Pairs.length,
  pair1: {
    dateRange: test7Pairs[0]?.dateRange,
    pnl: test7Pairs[0]?.pnl?.toFixed(2),
  },
  pair2: {
    dateRange: test7Pairs[1]?.dateRange,
    pnl: test7Pairs[1]?.pnl?.toFixed(2),
  },
});
console.log('Expected: 2 pairs, both profitable\n');

// Test 8: Fees in USDT
console.log('=== Test 8: Fees in USDT ===');
const test8Trades: TradeHistory[] = [
  createTrade('1', 'buy', '40000', '1', Date.parse('2024-12-05 09:00:00'), {
    feeCoin: 'USDT',
    totalFee: '50', // $50 fee
  }),
  createTrade('2', 'sell', '41000', '1', Date.parse('2024-12-05 15:00:00'), {
    feeCoin: 'USDT',
    totalFee: '50', // $50 fee
  }),
];
const test8Pairs = createTradePairs(test8Trades);
console.log('Result:', {
  pairs: test8Pairs.length,
  totalBuyCost: test8Pairs[0]?.totalBuyCost?.toFixed(2),
  totalSellRevenue: test8Pairs[0]?.totalSellRevenue?.toFixed(2),
  pnl: test8Pairs[0]?.pnl?.toFixed(2),
});
console.log('Expected: 1 pair, cost $40,050, revenue $40,950, PNL $900 (fees deducted)\n');

// Test 9: Fees in asset (BTC)
console.log('=== Test 9: Fees in Asset ===');
const test9Trades: TradeHistory[] = [
  createTrade('1', 'buy', '40000', '1', Date.parse('2024-12-05 09:00:00'), {
    feeCoin: 'BTC',
    totalFee: '0.001', // 0.001 BTC fee
  }),
  createTrade('2', 'sell', '41000', '1', Date.parse('2024-12-05 15:00:00'), {
    feeCoin: 'BTC',
    totalFee: '0.001', // 0.001 BTC fee
  }),
];
const test9Pairs = createTradePairs(test9Trades);
console.log('Result:', {
  pairs: test9Pairs.length,
  totalBuySize: test9Pairs[0]?.totalBuySize?.toFixed(4),
  pnl: test9Pairs[0]?.pnl?.toFixed(2),
});
console.log('Expected: 1 pair, effective buy size ~0.999 BTC (fee deducted), positive PNL\n');

// Test 10: Complex scenario with multiple buys/sells spanning days
console.log('=== Test 10: Complex Multi-Day Position ===');
const test10Trades: TradeHistory[] = [
  createTrade('1', 'buy', '40000', '1', Date.parse('2024-12-05 09:00:00')),
  createTrade('2', 'buy', '39500', '0.5', Date.parse('2024-12-05 14:00:00')),
  createTrade('3', 'buy', '40200', '0.3', Date.parse('2024-12-06 10:00:00')),
  createTrade('4', 'sell', '41000', '1', Date.parse('2024-12-06 15:00:00')),
  createTrade('5', 'sell', '41500', '0.8', Date.parse('2024-12-07 11:00:00')),
];
const test10Pairs = createTradePairs(test10Trades);
console.log('Result:', {
  pairs: test10Pairs.length,
  dateRange: test10Pairs[0]?.dateRange,
  buys: test10Pairs[0]?.buys.length,
  sells: test10Pairs[0]?.sells.length,
  totalBuySize: test10Pairs[0]?.totalBuySize?.toFixed(2),
  totalSellSize: test10Pairs[0]?.totalSellSize?.toFixed(2),
  pnl: test10Pairs[0]?.pnl?.toFixed(2),
});
console.log('Expected: 1 pair, "Dec 5 - Dec 7", 3 buys, 2 sells, 1.8 BTC total, positive PNL\n');

console.log('=== All Tests Complete ===');
console.log('Run this file with: ts-node tradePairingLogic.test.ts');
