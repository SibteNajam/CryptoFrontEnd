# Quick Usage Guide - Multi-Exchange Wallet

## How It Works

### 1. Exchange Selection (Redux)
Users select an exchange using the ExchangeSelector component:
```typescript
// This updates Redux:
dispatch(setSelectedExchange('bitget')); // or 'binance'
```

### 2. Wallet Page Auto-Updates
When exchange changes, wallet page automatically:
- Fetches new data from selected exchange
- Normalizes the response format
- Updates UI with exchange label

### 3. Data Flow
```
User selects "Bitget"
    ↓
Redux state updates
    ↓
wallet/page.tsx detects change via useAppSelector
    ↓
Clears old data & calls getDepositHistoryByExchange('bitget')
    ↓
API calls /bitget/account/deposit-history
    ↓
Response normalized to common format
    ↓
DepositsTab rendered with:
   - Bitget data
   - "BITGET" label in header
   - Normalized status values
```

---

## Components Overview

### WalletApi.ts
**Multi-exchange API wrapper:**
```typescript
// For Deposits
getDepositHistoryByExchange(exchange, credentials)
  └─ Returns: NormalizedTransactionResponse
     {
       total: number,
       transactions: NormalizedDeposit[],
       exchange: 'binance' | 'bitget'
     }

// For Withdrawals  
getWithdrawalHistoryByExchange(exchange, credentials)
  └─ Returns: NormalizedTransactionResponse
     {
       total: number,
       transactions: NormalizedWithdrawal[],
       exchange: 'binance' | 'bitget'
     }
```

**Normalized Data Format:**
```typescript
NormalizedDeposit {
  id: string;                    // Unique ID
  amount: string;                // "11.5"
  coin: string;                  // "USDT"
  network: string;               // "TRX" or "Plasma"
  status: 'pending' | 'success' | 'failed' | 'unknown';
  address: string;               // Destination address
  txId: string;                  // Transaction hash
  timestamp: number;             // Milliseconds (unified)
  exchange: 'binance' | 'bitget';
}
```

### deposits.tsx
**Unified Deposits Display:**
```typescript
<DepositsTab 
  depositHistory={data}  // Either format accepted
  exchange="bitget"      // For display labels
/>

// Internally:
// - Detects data format
// - Handles both numeric (Binance) and string (Bitget) status
// - Shows exchange name in UI
// - Calculates badges from normalized data
```

### withdraws.tsx
**Unified Withdrawals Display:**
```typescript
<WithdrawalsTab 
  withdrawHistory={data}  // Either format accepted
  exchange="binance"      // For display labels
/>

// Similar capabilities as deposits
```

### wallet/page.tsx
**Main Page Logic:**
```typescript
// Gets exchange from Redux
const selectedExchange = useAppSelector(getSelectedExchange);
const credentials = useAppSelector(getCredentials);

// Fetches appropriate data
const [deposits, withdrawals] = await Promise.all([
  getDepositHistoryByExchange(selectedExchange, credentialsObj),
  getWithdrawalHistoryByExchange(selectedExchange, credentialsObj),
]);

// Passes to components with exchange label
<DepositsTab depositHistory={deposits} exchange={selectedExchange} />
<WithdrawalsTab withdrawHistory={withdrawals} exchange={selectedExchange} />
```

---

## Status Mapping Examples

### Binance → Normalized
```
Raw: { status: 0 }           → Normalized: { status: 'pending' }
Raw: { status: 1 }           → Normalized: { status: 'success' }
Raw: { status: 2 }           → Normalized: { status: 'failed' }
Raw: { status: 6, 7 }        → Normalized: { status: 'failed' }
```

### Bitget → Normalized
```
Raw: { status: 'success' }   → Normalized: { status: 'success' }
Raw: { status: 'pending' }   → Normalized: { status: 'pending' }
Raw: { status: 'failed' }    → Normalized: { status: 'failed' }
Raw: { status: 'rejected' }  → Normalized: { status: 'failed' }
```

---

## UI Display

### Header Shows Exchange
```
Before: "Deposit History (5)"
After:  "Deposit History (5) - BITGET"
```

### Loading Message Includes Exchange
```
Before: "Fetching your deposit history."
After:  "Fetching your deposit history from BITGET."
```

### Empty State Includes Exchange
```
Before: "Your deposits will appear here once you make them."
After:  "Your deposits will appear here once you make them on BITGET."
```

---

## Caching Behavior

### Cache Keys
```typescript
// Includes exchange to separate caches
wallet_binance_deposits
wallet_binance_withdrawals
wallet_bitget_deposits
wallet_bitget_withdrawals
```

### Cache Duration
- 5 minutes for each dataset
- Automatically expires after timeout
- Manual refresh bypasses cache

### Behavior
```
User selects Bitget
  → Cached Bitget data? YES → Use cache, load from cache
  → Cached Bitget data? NO  → Fetch from API, cache it

User switches back to Binance
  → Cached Binance data? YES → Use cache (previous data still there)
  → Cached Binance data? NO  → Fetch from API, cache it
```

---

## Credentials Flow

### Setup in Redux
```typescript
dispatch(setCredentials({
  exchange: 'bitget',
  apiKey: 'key...',
  secretKey: 'secret...',
  passphrase: 'phrase...',
  label: 'My Bitget Account'
}));
```

### Usage in Wallet
```typescript
const credentials = useAppSelector(getCredentials);
// Returns credentials for SELECTED exchange only

const credsObj = credentials ? {
  apiKey: credentials.apiKey,
  secretKey: credentials.secretKey,
  passphrase: credentials.passphrase
} : undefined;

// Passed to API
getDepositHistoryByExchange('bitget', credsObj);
```

### API Handling
```typescript
// With credentials
if (credentials) {
  headers['x-api-key'] = credentials.apiKey;
  headers['x-secret-key'] = credentials.secretKey;
  if (credentials.passphrase) {
    headers['x-passphrase'] = credentials.passphrase;
  }
}

// Without credentials (public endpoints)
// Falls back to public API calls
```

---

## Debug Logging

### Console Output Examples
```
// Exchange switched
📋 Fetching wallet data for exchange: bitget

// API calls
🔵 BITGET API CALL: getBitgetDepositHistory
   URL: http://localhost:3000/bitget/account/deposit-history

// Responses
✅ BITGET DEPOSIT HISTORY RESPONSE: {
  count: 2,
  sample: [...]
}

// Component rendering
🔄 DepositsTab received data: {
  exchange: 'bitget',
  depositHistory: {...},
  isNormalized: true
}

✅ DepositsTab: Rendering with 2 deposits
```

---

## File Structure
```
src/
├── infrastructure/api/
│   └── WalletApi.ts ← UPDATED: Multi-exchange support
├── components/wallet/
│   ├── deposits.tsx ← UPDATED: Supports both formats
│   ├── withdraws.tsx ← UPDATED: Supports both formats
│   └── security.tsx (unchanged)
└── app/(dashboard)/
    └── wallet/
        └── page.tsx ← UPDATED: Redux integration
```

---

## Testing Steps

### 1. Test Binance (Default)
- [ ] Load wallet page
- [ ] Verify deposits load
- [ ] Verify "BINANCE" in header
- [ ] Verify status badges calculated correctly

### 2. Test Bitget Switch
- [ ] Have valid Bitget credentials in Redux
- [ ] Click exchange selector → Bitget
- [ ] Verify API call to /bitget/account/deposit-history
- [ ] Verify data loads
- [ ] Verify "BITGET" in header
- [ ] Verify network names extracted correctly

### 3. Test Cache
- [ ] Switch to Binance
- [ ] See API call
- [ ] Switch back to Binance
- [ ] No API call (uses cache)
- [ ] Wait 5+ minutes
- [ ] Cache expires, new API call triggers

### 4. Test Error Cases
- [ ] Invalid credentials → Error message
- [ ] Network error → Error message
- [ ] Empty history → "No Deposits Found"

---

## Common Issues & Solutions

### Issue: "No data loaded" message stuck
**Solution:** 
- Check Redux store has selectedExchange set
- Check credentials are stored for that exchange
- Check browser console for API errors
- Try manual refresh button

### Issue: Shows Binance data when Bitget selected
**Solution:**
- Clear browser localStorage
- Force page refresh (Ctrl+F5)
- Verify /bitget/ endpoint exists in backend

### Issue: Status shows as "unknown"
**Solution:**
- Check backend is returning valid status strings
- Valid statuses: 'success', 'pending', 'failed', etc.
- Map any new statuses in `normalizeStatus()` function

### Issue: Network names incomplete (e.g., "Plasma" vs "Plasma(Plasma)")
**Solution:**
- Chain extraction uses `.split('(')[0].trim()`
- Works for format: "NetworkName(Symbol)"
- If different format, update extraction in normalizeBitgetDeposit()

---

## Performance Tips

1. **Don't clear cache frequently** - Let 5-min cache work
2. **Use force refresh sparingly** - Only when needed
3. **Check Redux state** - Prevents unnecessary refetches
4. **Lazy load security** - Only fetches when tab clicked

---

## Future Roadmap

- [ ] Add Binance + Bitget combined view
- [ ] Add pagination for large histories  
- [ ] Add filtering by coin/status
- [ ] Add CSV export
- [ ] Add search functionality
- [ ] Add column sorting
- [ ] Add deposit/withdrawal statistics
- [ ] Add more exchanges (Kraken, Coinbase, etc.)
