# Trade Pairing Logic Documentation

## Overview
This document explains the exact implementation of the trade pairing algorithm used to group buy and sell orders into meaningful pairs for PNL calculation.

## Key Concepts

### 1. Position Tracking
The algorithm tracks your **net position** as it processes orders chronologically:
- **Buy order** → Position increases by the size amount
- **Sell order** → Position decreases by the size amount
- **Position closed** → When net position ≈ 0 (within 0.001 tolerance)

### 2. Chronological Processing
Orders are sorted by timestamp (oldest first) to ensure proper pairing:
```typescript
const sortedTrades = [...trades].sort((a, b) => Number(a.cTime) - Number(b.cTime));
```

### 3. Cross-Day Positions
Positions can span multiple days. Example:
```
Day 1: Buy 10 BTC
Day 2: Buy 5 BTC
Day 3: Sell 15 BTC
```
All three orders are paired together because they represent one complete position.

## Algorithm Flow

```typescript
let netPosition = 0;
let currentBuys = [];
let currentSells = [];

for (const trade of sortedTrades) {
  const size = parseFloat(trade.size);
  
  if (trade.side === 'buy') {
    currentBuys.push(trade);
    netPosition += size;  // Increase position
  } else {
    currentSells.push(trade);
    netPosition -= size;  // Decrease position
  }
  
  // Position closed? Create a pair
  if (Math.abs(netPosition) < 0.001 && 
      currentBuys.length > 0 && 
      currentSells.length > 0) {
    
    createPair(currentBuys, currentSells);
    
    // Reset for next position
    currentBuys = [];
    currentSells = [];
    netPosition = 0;
  }
}
```

## PNL Calculation

### Buy Side
1. **Effective Size**: Account for fees paid in the asset
   ```typescript
   if (feeDetail.feeCoin !== 'USDT') {
     effectiveSize = buySize - feeInAsset;
   }
   ```

2. **Total Cost**: Sum of (size × price) + USDT fees
   ```typescript
   totalBuyCost += buySize * price;
   if (feeDetail.feeCoin === 'USDT') {
     totalBuyCost += fee;
   }
   ```

3. **Average Buy Price**:
   ```typescript
   avgBuyPrice = totalBuyCost / totalBuySize;
   ```

### Sell Side
1. **Total Revenue**: Sum of (size × price) - all fees
   ```typescript
   totalSellRevenue += sellSize * price;
   
   // Subtract fees
   if (feeDetail.feeCoin === 'USDT') {
     totalSellRevenue -= fee;
   } else {
     totalSellRevenue -= feeInAsset * price;
   }
   ```

2. **Average Sell Price**:
   ```typescript
   avgSellPrice = totalSellRevenue / totalSellSize;
   ```

### Final PNL
```typescript
const matchedSize = Math.min(totalBuySize, totalSellSize);
const costBasis = matchedSize * avgBuyPrice;
pnl = totalSellRevenue - costBasis;
pnlPercent = (pnl / costBasis) * 100;
```

## Example Scenarios

### Scenario 1: Multiple Buys, One Sell (Same Day)
```
09:00 - Buy 1 BTC @ $40,000
10:00 - Buy 0.5 BTC @ $40,500
11:00 - Sell 1.5 BTC @ $41,000

Result: One pair with 2 buys, 1 sell
- Total Buy Cost: (1 × 40000) + (0.5 × 40500) = $60,250
- Total Buy Size: 1.5 BTC
- Avg Buy Price: $40,166.67
- Total Sell Revenue: 1.5 × 41000 = $61,500
- PNL: $61,500 - $60,250 = +$1,250 (+2.07%)
```

### Scenario 2: Cross-Day Position
```
Dec 5, 09:00 - Buy 2 BTC @ $40,000
Dec 6, 10:00 - Buy 1 BTC @ $39,500
Dec 7, 15:00 - Sell 3 BTC @ $41,000

Result: One pair spanning 3 days
- Date Range: "Dec 5 - Dec 7"
- All 3 orders grouped together
- PNL calculated for complete position
```

### Scenario 3: Moved Orders (Purple Highlight)
```
Dec 5 (Main Day):
  09:00 - Buy 1 BTC @ $40,000
  10:00 - Sell 0.5 BTC @ $41,000

Dec 3 (Moved Order):
  14:00 - Buy 0.5 BTC @ $39,000  ← This shows with purple bg + day "3"

Result: One pair with mixed dates
- The Dec 3 buy is highlighted purple
- Day number "3" badge shown
- Position: 1.5 BTC bought, 0.5 BTC sold = 1 BTC open
```

### Scenario 4: Pending Position (No Sells)
```
10:00 - Buy 1 BTC @ $40,000
11:00 - Buy 0.5 BTC @ $40,500

Result: One pair with "PENDING" badge
- 2 buys, 0 sells
- PNL: null (can't calculate without sells)
- Shows "PENDING" badge
```

### Scenario 5: Unmatched Sells
```
10:00 - Sell 1 BTC @ $41,000

Result: One pair with warning
- 0 buys, 1 sell
- Shows "⚠️ Unmatched sells" warning
- PNL: null
```

## Visual Indicators

### 1. Moved Orders (Purple Background)
Orders from different dates within the same pair:
```tsx
{isMovedOrder && (
  <>
    <span className="bg-purple-200 dark:bg-purple-600">
      {orderDay}
    </span>
    <div className="bg-purple-50/60 dark:bg-purple-400/5">
      {/* Order details */}
    </div>
  </>
)}
```

### 2. Status Badges
- **PENDING** (Orange): Open buys without matching sells
- **Unmatched sells** (Purple): Sells without matching buys
- **Day numbers** (Purple): Highlight cross-day orders

### 3. PNL Colors
- **Green**: Profit (pnl >= 0)
- **Red**: Loss (pnl < 0)

## Edge Cases Handled

1. **Rounding Errors**: Uses 0.001 tolerance for position closure
2. **Missing Fees**: Handles trades without fee details
3. **Mixed Fee Currencies**: Supports fees in both USDT and asset
4. **Empty Positions**: Handles buys-only or sells-only groups
5. **Zero Prices**: Handles missing price data gracefully

## Date Range Formatting

```typescript
const startDate = firstTradeDate.toLocaleDateString(undefined, { 
  month: 'short', 
  day: 'numeric' 
});
const endDate = lastTradeDate.toLocaleDateString(undefined, { 
  month: 'short', 
  day: 'numeric' 
});

// Same day: "Dec 5"
// Multiple days: "Dec 5 - Dec 7"
const dateRange = startDate === endDate ? startDate : `${startDate} - ${endDate}`;
```

## Performance Considerations

1. **Single Pass**: Algorithm processes each trade exactly once
2. **Memory Efficient**: Only stores current position trades
3. **Sorted Once**: Initial sort is O(n log n), then O(n) processing
4. **Time Complexity**: O(n log n) overall

## Testing Checklist

- [ ] Single day, single buy/sell pair
- [ ] Multiple buys, single sell (same day)
- [ ] Single buy, multiple sells (same day)
- [ ] Cross-day positions (2+ days)
- [ ] Moved orders showing purple highlight
- [ ] Pending positions (buys only)
- [ ] Unmatched sells
- [ ] Fee deductions (USDT and asset)
- [ ] PNL calculation accuracy
- [ ] Date range formatting

## Integration Example

```typescript
import { createTradePairs, isMovedOrder, getOrderDay } from './tradePairingLogic';

// Get trades for a symbol
const trades = tradeHistory.filter(t => t.symbol === 'BTCUSDT');

// Create pairs
const pairs = createTradePairs(trades);

// Render pairs
pairs.forEach(pair => {
  console.log(`Date: ${pair.dateRange}`);
  console.log(`Buys: ${pair.buys.length}, Sells: ${pair.sells.length}`);
  console.log(`PNL: $${pair.pnl?.toFixed(2)} (${pair.pnlPercent?.toFixed(2)}%)`);
  
  // Check for moved orders
  pair.buys.forEach(buy => {
    if (isMovedOrder(buy, pair.buys)) {
      console.log(`  Moved order from day ${getOrderDay(buy)}`);
    }
  });
});
```

## Summary

This algorithm provides:
✅ Accurate position tracking across multiple days
✅ Proper fee accounting (asset and USDT)
✅ Visual indicators for cross-day orders
✅ Flexible handling of open positions
✅ Precise PNL calculations
✅ Clear separation of completed and pending positions
