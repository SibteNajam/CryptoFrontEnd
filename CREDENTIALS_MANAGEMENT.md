# Exchange Credentials Management System

## Overview

The credentials management system stores one set of credentials per exchange in Redux state and persists them to localStorage. When you add credentials for an exchange, they replace any existing credentials for that exchange.

## Architecture

### Data Structure

```typescript
interface ExchangeState {
  selectedExchange: ExchangeType; // Currently active exchange
  credentialsArray: ExchangeCredentials[]; // Array of credentials, one per exchange
  isSetupModalOpen: boolean;
}

interface ExchangeCredentials {
  exchange: ExchangeType; // 'binance' | 'bitget'
  apiKey: string;
  secretKey: string;
  passphrase?: string; // Required for Bitget, optional for Binance
  label: string; // User-friendly name
}
```

### Key Features

1. **One Credential Per Exchange**: Each exchange can have only one set of credentials at a time
2. **Automatic Updates**: Adding new credentials for an exchange replaces the old ones
3. **Persistence**: Credentials are automatically saved to localStorage and restored on page reload
4. **Selected Exchange**: The currently selected exchange is also persisted

## Usage

### 1. Setting Credentials

```typescript
import { setCredentials } from '@/infrastructure/features/exchange/exchangeSlice';
import { useAppDispatch } from '@/infrastructure/store/hooks';

const dispatch = useAppDispatch();

// Add or update credentials for an exchange
dispatch(setCredentials({
  exchange: 'binance',
  apiKey: 'your-api-key',
  secretKey: 'your-secret-key',
  label: 'My Trading Account'
}));

// For Bitget (passphrase required)
dispatch(setCredentials({
  exchange: 'bitget',
  apiKey: 'your-api-key',
  secretKey: 'your-secret-key',
  passphrase: 'your-passphrase',
  label: 'Bitget Trading'
}));
```

### 2. Getting Credentials

```typescript
import { getCredentials } from '@/infrastructure/features/exchange/exchangeSlice';
import { useAppSelector } from '@/infrastructure/store/hooks';

// Get credentials for the currently selected exchange
const credentials = useAppSelector(getCredentials);

if (credentials) {
  console.log('API Key:', credentials.apiKey);
  console.log('Exchange:', credentials.exchange);
}
```

### 3. Getting All Credentials

```typescript
import { getAllCredentials } from '@/infrastructure/features/exchange/exchangeSlice';

// Get all stored credentials
const allCredentials = useAppSelector(getAllCredentials);
console.log('Total exchanges configured:', allCredentials.length);
```

### 4. Getting Credentials for a Specific Exchange

```typescript
import { getCredentialsForExchange } from '@/infrastructure/features/exchange/exchangeSlice';

// Get credentials for a specific exchange (regardless of selection)
const binanceCredentials = useAppSelector(getCredentialsForExchange('binance'));
const bitgetCredentials = useAppSelector(getCredentialsForExchange('bitget'));
```

### 5. Checking if Credentials Exist

```typescript
import { hasCredentials, hasCredentialsForExchange } from '@/infrastructure/features/exchange/exchangeSlice';

// Check if selected exchange has credentials
const hasCurrentCredentials = useAppSelector(hasCredentials);

// Check if specific exchange has credentials
const hasBinanceCredentials = useAppSelector(hasCredentialsForExchange('binance'));
const hasBitgetCredentials = useAppSelector(hasCredentialsForExchange('bitget'));
```

### 6. Switching Exchanges

```typescript
import { setSelectedExchange } from '@/infrastructure/features/exchange/exchangeSlice';

// Switch to a different exchange
dispatch(setSelectedExchange('bitget'));

// The getCredentials selector will now return Bitget credentials (if they exist)
```

### 7. Clearing Credentials

```typescript
import { clearCredentials } from '@/infrastructure/features/exchange/exchangeSlice';

// Clear credentials for a specific exchange
dispatch(clearCredentials('binance'));

// Clear all credentials
dispatch(clearCredentials());
```

## Integration with Components

### Using with useExchange Hook

The `useExchange` hook automatically uses credentials for the selected exchange:

```typescript
import { useExchange } from '@/hooks/useExchange';

function TradingComponent() {
  const {
    selectedExchange,
    hasCredentials,
    isConnected,
    exchangeService,
    connectToExchange,
    getAccountInfo
  } = useExchange();

  // The hook automatically uses credentials for the selected exchange
  // No need to manually fetch or pass credentials
}
```

### ExchangeSelector Component

The `ExchangeSelector` component handles the UI for adding/updating credentials:

```typescript
import { toggleSetupModal } from '@/infrastructure/features/exchange/exchangeSlice';

// Open the credentials modal
dispatch(toggleSetupModal());

// The modal will:
// 1. Load existing credentials for the selected exchange (if any)
// 2. Allow user to enter/update credentials
// 3. Save credentials using setCredentials action
// 4. Automatically persist to localStorage
```

## Persistence

### How it Works

1. **Automatic Save**: Every time Redux state changes, the entire state is saved to localStorage
2. **Automatic Load**: On page load/refresh, credentials are restored from localStorage
3. **Authentication Required**: Credentials are only saved/loaded when user is authenticated
4. **Legacy Migration**: Old single-credential format is automatically migrated to the new array format

### localStorage Key

```javascript
// Stored in localStorage under the key:
'reduxState'

// Structure:
{
  auth: { ... },
  exchange: {
    selectedExchange: 'binance',
    credentialsArray: [
      {
        exchange: 'binance',
        apiKey: '...',
        secretKey: '...',
        label: 'My Account'
      },
      {
        exchange: 'bitget',
        apiKey: '...',
        secretKey: '...',
        passphrase: '...',
        label: 'Bitget Account'
      }
    ],
    isSetupModalOpen: false
  }
}
```

## Behavior Examples

### Example 1: Adding First Credentials

```typescript
// Initial state
credentialsArray: []

// Add Binance credentials
dispatch(setCredentials({
  exchange: 'binance',
  apiKey: 'abc123',
  secretKey: 'xyz789',
  label: 'Main Account'
}));

// Result
credentialsArray: [
  { exchange: 'binance', apiKey: 'abc123', secretKey: 'xyz789', label: 'Main Account' }
]
```

### Example 2: Updating Existing Credentials

```typescript
// Current state
credentialsArray: [
  { exchange: 'binance', apiKey: 'abc123', secretKey: 'xyz789', label: 'Main Account' }
]

// Update Binance credentials (new keys)
dispatch(setCredentials({
  exchange: 'binance',
  apiKey: 'newkey456',
  secretKey: 'newsecret999',
  label: 'Updated Account'
}));

// Result (old credentials replaced)
credentialsArray: [
  { exchange: 'binance', apiKey: 'newkey456', secretKey: 'newsecret999', label: 'Updated Account' }
]
```

### Example 3: Adding Multiple Exchanges

```typescript
// Add Binance
dispatch(setCredentials({
  exchange: 'binance',
  apiKey: 'binance-key',
  secretKey: 'binance-secret',
  label: 'Binance Account'
}));

// Add Bitget
dispatch(setCredentials({
  exchange: 'bitget',
  apiKey: 'bitget-key',
  secretKey: 'bitget-secret',
  passphrase: 'bitget-pass',
  label: 'Bitget Account'
}));

// Result
credentialsArray: [
  { exchange: 'binance', apiKey: 'binance-key', secretKey: 'binance-secret', label: 'Binance Account' },
  { exchange: 'bitget', apiKey: 'bitget-key', secretKey: 'bitget-secret', passphrase: 'bitget-pass', label: 'Bitget Account' }
]
```

### Example 4: Switching Between Exchanges

```typescript
// Current state
selectedExchange: 'binance'
credentialsArray: [
  { exchange: 'binance', ... },
  { exchange: 'bitget', ... }
]

// getCredentials() returns Binance credentials

// Switch to Bitget
dispatch(setSelectedExchange('bitget'));

// Now getCredentials() returns Bitget credentials
// All components using useExchange will automatically use Bitget
```

## Best Practices

1. **Always Check for Credentials**: Before making API calls, check if credentials exist
   ```typescript
   const hasCredentials = useAppSelector(hasCredentials);
   if (!hasCredentials) {
     // Show setup modal or error message
   }
   ```

2. **Use Selectors**: Always use the provided selectors instead of accessing state directly
   ```typescript
   // ✅ Good
   const credentials = useAppSelector(getCredentials);
   
   // ❌ Bad
   const credentials = useAppSelector(state => state.exchange.credentialsArray[0]);
   ```

3. **Handle Updates Gracefully**: When updating credentials, inform users that existing credentials will be replaced
   ```typescript
   // Check if credentials already exist
   const existingCreds = useAppSelector(getCredentialsForExchange('binance'));
   if (existingCreds) {
     // Show confirmation: "This will replace your existing Binance credentials"
   }
   ```

4. **Validate Before Saving**: Always validate API keys before dispatching
   ```typescript
   if (!apiKey.trim() || !secretKey.trim()) {
     // Show error
     return;
   }
   ```

## Security Considerations

1. **Never Log Sensitive Data**: Avoid logging API keys or secrets
2. **Use Environment Flags**: In production, consider additional encryption for localStorage
3. **Clear on Logout**: Ensure credentials are cleared when user logs out
4. **API Permissions**: Always use API keys with limited permissions (no withdrawal rights)
5. **HTTPS Only**: Ensure your application runs over HTTPS in production

## Migration from Old System

The system automatically handles migration from the old single-credential format:

```typescript
// Old format (automatically migrated)
{
  credentials: { exchange: 'binance', apiKey: '...', secretKey: '...', label: '...' }
}

// New format (after migration)
{
  credentialsArray: [
    { exchange: 'binance', apiKey: '...', secretKey: '...', label: '...' }
  ]
}
```

No manual intervention required!
