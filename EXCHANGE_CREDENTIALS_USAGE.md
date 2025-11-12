# 📖 How to Access Exchange Credentials in Your Code

## Simple Implementation - One Credential at a Time

The Redux store saves **only the current exchange credentials**. When you save new credentials, they **replace** the previous ones.

---

## Redux State Structure

```typescript
{
  exchange: {
    selectedExchange: 'binance',  // Current exchange: 'binance' | 'bitget'
    credentials: {
      exchange: 'binance',
      apiKey: 'your_api_key',
      secretKey: 'your_secret_key',
      label: 'My Trading Account'
    } | null,
    isSetupModalOpen: false
  }
}
```

---

## How to Use in Any Component

### Example 1: Simple Access
```typescript
import { useAppSelector } from '@/infrastructure/store/hooks';

export default function MyComponent() {
  const { selectedExchange, credentials } = useAppSelector(state => state.exchange);
  
  return (
    <div>
      <p>Exchange: {selectedExchange}</p>
      {credentials ? (
        <div>
          <p>✅ Connected to {credentials.exchange}</p>
          <p>Label: {credentials.label}</p>
          <p>API Key: {credentials.apiKey.substring(0, 10)}...</p>
        </div>
      ) : (
        <p>❌ No credentials set</p>
      )}
    </div>
  );
}
```

### Example 2: Check if Credentials Match Selected Exchange
```typescript
import { useAppSelector } from '@/infrastructure/store/hooks';

export default function TradingComponent() {
  const { selectedExchange, credentials } = useAppSelector(state => state.exchange);
  
  // Check if credentials match the selected exchange
  const hasValidCredentials = credentials && credentials.exchange === selectedExchange;
  
  if (!hasValidCredentials) {
    return <div>⚠️ Please setup {selectedExchange} API credentials</div>;
  }
  
  // Use credentials for trading
  const apiKey = credentials.apiKey;
  const secretKey = credentials.secretKey;
  
  return <div>Ready to trade on {selectedExchange}</div>;
}
```

### Example 3: Using with useExchange Hook
```typescript
import { useExchange } from '@/hooks/useExchange';

export default function AccountInfo() {
  const { 
    selectedExchange, 
    hasCredentials, 
    currentExchangeConfig,
    getAccountInfo 
  } = useExchange();
  
  if (!hasCredentials) {
    return <div>No credentials for {selectedExchange}</div>;
  }
  
  const handleFetchAccount = async () => {
    const accountInfo = await getAccountInfo();
    console.log('Account:', accountInfo);
  };
  
  return (
    <div>
      <p>Exchange: {currentExchangeConfig?.exchange}</p>
      <p>Label: {currentExchangeConfig?.label}</p>
      <button onClick={handleFetchAccount}>Get Account Info</button>
    </div>
  );
}
```

---

## Change Exchange Programmatically

```typescript
import { useAppDispatch } from '@/infrastructure/store/hooks';
import { setSelectedExchange } from '@/infrastructure/features/exchange/exchangeSlice';

export default function ExchangeSwitcher() {
  const dispatch = useAppDispatch();
  
  return (
    <div>
      <button onClick={() => dispatch(setSelectedExchange('binance'))}>
        Switch to Binance
      </button>
      <button onClick={() => dispatch(setSelectedExchange('bitget'))}>
        Switch to Bitget
      </button>
    </div>
  );
}
```

---

## Clear Credentials

```typescript
import { useAppDispatch } from '@/infrastructure/store/hooks';
import { clearCredentials } from '@/infrastructure/features/exchange/exchangeSlice';

export default function LogoutButton() {
  const dispatch = useAppDispatch();
  
  const handleLogout = () => {
    dispatch(clearCredentials());
    console.log('✅ Credentials cleared from Redux');
  };
  
  return <button onClick={handleLogout}>Clear Credentials</button>;
}
```

---

## Open Exchange Setup Modal

```typescript
import { useAppDispatch } from '@/infrastructure/store/hooks';
import { toggleSetupModal } from '@/infrastructure/features/exchange/exchangeSlice';

export default function SetupButton() {
  const dispatch = useAppDispatch();
  
  return (
    <button onClick={() => dispatch(toggleSetupModal())}>
      Setup API Credentials
    </button>
  );
}
```

---

## Complete Example: Trading Dashboard

```typescript
'use client';

import { useAppSelector, useAppDispatch } from '@/infrastructure/store/hooks';
import { setSelectedExchange, toggleSetupModal } from '@/infrastructure/features/exchange/exchangeSlice';

export default function TradingDashboard() {
  const dispatch = useAppDispatch();
  const { selectedExchange, credentials } = useAppSelector(state => state.exchange);
  
  const hasCredentials = credentials && credentials.exchange === selectedExchange;
  
  return (
    <div className="p-4">
      {/* Exchange Selector */}
      <div className="mb-4">
        <label>Select Exchange:</label>
        <select 
          value={selectedExchange}
          onChange={(e) => dispatch(setSelectedExchange(e.target.value as any))}
        >
          <option value="binance">Binance</option>
          <option value="bitget">Bitget</option>
        </select>
      </div>
      
      {/* Credentials Status */}
      {hasCredentials ? (
        <div className="bg-green-100 p-3 rounded">
          <p>✅ Connected to {credentials.exchange}</p>
          <p>Label: {credentials.label}</p>
          <p>API Key: {credentials.apiKey.substring(0, 10)}...</p>
        </div>
      ) : (
        <div className="bg-yellow-100 p-3 rounded">
          <p>⚠️ No credentials for {selectedExchange}</p>
          <button 
            onClick={() => dispatch(toggleSetupModal())}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
          >
            Setup Credentials
          </button>
        </div>
      )}
      
      {/* Trading Interface */}
      {hasCredentials && (
        <div className="mt-4">
          <h3>Trading on {selectedExchange.toUpperCase()}</h3>
          {/* Your trading components */}
        </div>
      )}
    </div>
  );
}
```

---

## Important Notes

1. **Single Credential Storage**: Only one exchange credential is stored at a time
2. **Automatic Replacement**: New credentials replace old ones automatically
3. **No Backend Fetch on Load**: Credentials are NOT fetched from backend on app load (only saved when user enters them)
4. **Session Storage**: Credentials only persist in Redux during the current session (lost on page refresh)
5. **Backend Saves**: Credentials are encrypted and saved to your NestJS backend API

---

## Redux Actions Available

- `setSelectedExchange(exchange)` - Change current exchange
- `setCredentials({ exchange, apiKey, secretKey, label })` - Save credentials
- `clearCredentials()` - Remove all credentials
- `toggleSetupModal()` - Open/close setup modal

---

## Selectors Available

```typescript
import { getCredentials, getSelectedExchange, hasCredentials } from '@/infrastructure/features/exchange/exchangeSlice';
import { useAppSelector } from '@/infrastructure/store/hooks';

const credentials = useAppSelector(getCredentials);
const exchange = useAppSelector(getSelectedExchange);
const hasValid = useAppSelector(hasCredentials);
```
