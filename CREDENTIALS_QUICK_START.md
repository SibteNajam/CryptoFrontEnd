# Quick Start: Using Exchange Credentials

## For Component Developers

### 1. Just Use the Hook (Easiest)

```typescript
import { useExchange } from '@/hooks/useExchange';

function MyTradingComponent() {
  const { 
    hasCredentials, 
    isConnected,
    connectToExchange,
    exchangeService 
  } = useExchange();

  // That's it! The hook automatically:
  // - Uses credentials for the selected exchange
  // - Returns null if no credentials exist
  // - Updates when exchange selection changes

  if (!hasCredentials) {
    return <div>Please add exchange credentials first</div>;
  }

  // Use exchangeService for API calls
}
```

### 2. Getting Credentials Manually

```typescript
import { useAppSelector } from '@/infrastructure/store/hooks';
import { getCredentials } from '@/infrastructure/features/exchange/exchangeSlice';

function MyComponent() {
  // Get credentials for currently selected exchange
  const credentials = useAppSelector(getCredentials);
  
  if (!credentials) {
    return <div>No credentials</div>;
  }
  
  // Use credentials.apiKey, credentials.secretKey, etc.
}
```

### 3. Checking Multiple Exchanges

```typescript
import { getAllCredentials, getCredentialsForExchange } from '@/infrastructure/features/exchange/exchangeSlice';

// Get all credentials
const allCreds = useAppSelector(getAllCredentials);
console.log('Configured exchanges:', allCreds.map(c => c.exchange));

// Check specific exchange
const binanceCreds = useAppSelector(getCredentialsForExchange('binance'));
const bitgetCreds = useAppSelector(getCredentialsForExchange('bitget'));
```

## For Form Developers

### Adding/Updating Credentials

```typescript
import { setCredentials } from '@/infrastructure/features/exchange/exchangeSlice';
import { useAppDispatch } from '@/infrastructure/store/hooks';

function CredentialsForm() {
  const dispatch = useAppDispatch();
  
  const handleSave = () => {
    // This automatically replaces old credentials if they exist
    dispatch(setCredentials({
      exchange: 'binance', // or 'bitget'
      apiKey: 'your-api-key',
      secretKey: 'your-secret-key',
      passphrase: 'optional-passphrase', // Only for Bitget
      label: 'My Trading Account'
    }));
    
    // Credentials are automatically saved to localStorage
    // No additional code needed!
  };
}
```

## Common Scenarios

### Scenario 1: Check if User Needs to Add Credentials

```typescript
import { hasCredentials } from '@/infrastructure/features/exchange/exchangeSlice';

const needsSetup = !useAppSelector(hasCredentials);

if (needsSetup) {
  // Show setup button or modal
}
```

### Scenario 2: Switch Exchange and Use Its Credentials

```typescript
import { setSelectedExchange } from '@/infrastructure/features/exchange/exchangeSlice';

// Switch to Bitget
dispatch(setSelectedExchange('bitget'));

// Now all components using getCredentials or useExchange
// will automatically use Bitget credentials
```

### Scenario 3: Clear Credentials on Logout

```typescript
import { clearCredentials } from '@/infrastructure/features/exchange/exchangeSlice';

function logout() {
  // Clear all exchange credentials
  dispatch(clearCredentials());
  
  // Or clear specific exchange
  dispatch(clearCredentials('binance'));
}
```

## Important Notes

1. **One Credential Per Exchange**: Each exchange can only have one set of credentials. Adding new credentials for the same exchange replaces the old ones.

2. **Automatic Persistence**: Everything is saved to localStorage automatically. You don't need to manage storage manually.

3. **Exchange Selection**: The selected exchange is also persisted, so users return to the same exchange after refresh.

4. **Use Selectors**: Always use the provided selectors (`getCredentials`, `hasCredentials`, etc.) instead of accessing state directly.

5. **Error Handling**: Always check if credentials exist before making API calls:
   ```typescript
   const credentials = useAppSelector(getCredentials);
   if (!credentials) {
     // Handle missing credentials
     return;
   }
   ```

## FAQ

**Q: What happens when I add credentials for an exchange that already has credentials?**  
A: The old credentials are automatically replaced with the new ones.

**Q: Do I need to save to localStorage manually?**  
A: No, it's automatic. Every Redux state change is saved to localStorage.

**Q: What if the page refreshes?**  
A: Credentials and exchange selection are automatically restored from localStorage.

**Q: Can I have multiple credential sets for one exchange?**  
A: No, each exchange has exactly one set of credentials. This keeps things simple and prevents confusion.

**Q: How do I switch between Binance and Bitget?**  
A: Use `dispatch(setSelectedExchange('bitget'))`. All components will automatically use the Bitget credentials.

**Q: What's the difference between `clearCredentials()` and `clearCredentials('binance')`?**  
A: `clearCredentials()` removes all credentials. `clearCredentials('binance')` only removes Binance credentials.
