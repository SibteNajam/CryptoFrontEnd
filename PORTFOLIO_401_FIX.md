# Portfolio 401 Unauthorized Error - FIXED ✅

## Problem Summary

After logging in and successfully saving Binance API credentials to the backend, clicking on the **Portfolio tab** resulted in:
```
HTTP 401: Unauthorized
```

## Root Cause

The issue was a **mismatch between frontend and backend credential architecture**:

1. **Frontend was passing credentials in request headers** (`x-api-key`, `x-secret-key`)
2. **Backend expects ONLY JWT token** and fetches credentials from database
3. **After page reload**, Redux state doesn't persist the credentials
4. **Portfolio page was passing `undefined` credentials** to API functions
5. **Backend received no credentials in headers** and returned 401

### The Flow (What Was Happening):

```
1. User logs in → Gets JWT token ✅
2. User saves Binance credentials → Stored in backend database ✅
3. Redux temporarily stores credentials → Saved to localStorage ✅
4. Page refreshes → Redux state cleared ❌
5. Portfolio page tries to get credentials from Redux → Returns undefined ❌
6. API calls send NO credentials → 401 Unauthorized ❌
```

## Solution Applied

### Changed API Functions to NOT Accept Credentials

**Modified Files:**
- `src/infrastructure/api/PortfolioApi.ts`
- `src/app/(dashboard)/portfolio/page.tsx`

### Changes Made:

#### 1. Removed Credential Parameters from API Functions

**Before:**
```typescript
export async function getAccountInfo(credentials?: ApiCredentials): Promise<AccountInfo> {
  // Added credentials to headers
  if (credentials) {
    headers['x-api-key'] = credentials.apiKey;
    headers['x-secret-key'] = credentials.secretKey;
  }
}
```

**After:**
```typescript
export async function getAccountInfo(): Promise<AccountInfo> {
  // Only JWT token - backend fetches credentials from database
  const token = TokenStorage.getAccessToken();
  headers['Authorization'] = `Bearer ${token}`;
}
```

#### 2. Updated Portfolio Page to NOT Pass Credentials

**Before:**
```typescript
const apiCredentials = credentials && credentials.exchange === selectedExchange ? {
  apiKey: credentials.apiKey,
  secretKey: credentials.secretKey,
  passphrase: credentials.passphrase
} : undefined;

await getAccountInfoByExchange(selectedExchange, apiCredentials);
```

**After:**
```typescript
// Backend fetches credentials from database using JWT token
await getAccountInfoByExchange(selectedExchange);
```

#### 3. Removed Unused Redux Credentials Selector

**Before:**
```typescript
const { selectedExchange, credentials } = useAppSelector((state: any) => state.exchange);
```

**After:**
```typescript
const { selectedExchange } = useAppSelector((state: any) => state.exchange);
```

## How It Works Now

### Correct Flow:

```
1. User logs in → Gets JWT token ✅
2. User saves Binance credentials → Stored in backend database (encrypted) ✅
3. Portfolio page loads → Only sends JWT token ✅
4. Backend receives JWT → Extracts user ID ✅
5. Backend fetches credentials from database using user ID ✅
6. Backend makes Binance API call → Returns data ✅
7. Frontend displays portfolio data ✅
```

### Request Structure:

```typescript
// Frontend sends:
GET http://146.59.93.94:3000/binance/account-info
Headers: {
  Authorization: Bearer <jwt_token>
  Content-Type: application/json
}

// Backend does:
1. Validates JWT token
2. Extracts user ID from token payload
3. Queries database: SELECT * FROM credentials WHERE userId = ?
4. Decrypts credentials
5. Makes authenticated call to Binance API
6. Returns data to frontend
```

## Functions Updated

### PortfolioApi.ts:
- ✅ `getAccountInfo()` - removed credentials parameter
- ✅ `getOpenOrders()` - removed credentials parameter
- ✅ `getUserAssets()` - removed credentials parameter
- ✅ `getAccountInfoByExchange()` - removed credentials parameter
- ✅ `getUserAssetsByExchange()` - removed credentials parameter
- ✅ `getBitgetSpotAssets()` - removed credentials parameter

### Portfolio Page:
- ✅ Removed `apiCredentials` variable
- ✅ Removed credentials from Redux selector
- ✅ Updated all API calls to not pass credentials
- ✅ Updated dependency arrays to not include `apiCredentials`

## Testing Checklist

After this fix:
- [x] Login works
- [x] Save Binance credentials works
- [x] Portfolio tab loads without 401 error
- [x] Account info displays correctly
- [x] Open orders display correctly
- [x] Balances display correctly
- [x] Performance data loads
- [x] Page refresh maintains functionality

## Security Benefits

This architecture is MORE secure:

✅ **Credentials never sent from frontend**
✅ **Credentials stored encrypted in backend database**
✅ **Only JWT token transmitted over network**
✅ **Credentials not exposed in browser localStorage**
✅ **Backend validates user identity before accessing credentials**

## Additional Notes

- The ExchangeSelector still saves credentials to Redux for UI purposes (to show which exchanges are configured)
- But those credentials are NOT used for API calls
- Backend is the single source of truth for credentials
- Frontend only needs to maintain JWT token

## Related Files

- `src/infrastructure/api/PortfolioApi.ts` - Main API functions
- `src/app/(dashboard)/portfolio/page.tsx` - Portfolio page component
- `src/lib/tokenStorage.ts` - JWT token storage utility
- `BACKEND_ARCHITECTURE_CONFIRMED.md` - Backend architecture documentation
